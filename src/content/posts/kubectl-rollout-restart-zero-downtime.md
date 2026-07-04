Most engineers treat `kubectl rollout restart` as a safe operation. The name implies it. The docs don't warn against it. And when it works, Kubernetes confirms it:

```
deployment "api" successfully rolled out
```

But "successfully rolled out" and "zero downtime" are not the same thing. Kubernetes is telling you the rollout completed by its own definition — not that your users experienced no errors.

Zero downtime during a rollout is a property of your entire system. It requires the right Kubernetes configuration, the right readiness signaling, and the right application behavior — all at once. Miss any one of them and you'll see 5XXs.

This post walks through each failure mode, why it happens, and the exact fix.

---

## Case 1 — The default rolling update strategy isn't safe under load

### What happens

Kubernetes' default rolling update strategy allows `maxUnavailable: 1`. On a Deployment with four replicas, that means Kubernetes can terminate one Pod before its replacement is Ready.

During that window you have three Pods handling traffic that was previously spread across four. At low traffic this is invisible. At peak load, that 25% capacity reduction causes timeouts.

### Why it's subtle

The rollout still completes successfully. Kubernetes just took one Pod down, brought a new one up, and moved on. It did exactly what it was configured to do.

### The fix

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0
    maxSurge: 1
```

`maxUnavailable: 0` — Kubernetes will not terminate an old Pod until the replacement is Ready. Capacity never drops below 100%.

`maxSurge: 1` — one extra Pod is allowed during the transition, so the new Pod can start before the old one is removed.

---

## Case 2 — The readiness probe signals ready before the application is ready

### What happens

With `maxUnavailable: 0`, Kubernetes waits for the new Pod to pass its readiness probe before terminating the old one. The problem: most readiness probes only check if the HTTP server has started — not if the application is actually ready to serve traffic.

A common example: an application that warms a large in-memory cache on startup. The HTTP server starts in under a second. The cache takes 20–30 seconds to warm. If the readiness probe hits `/healthz` and gets a `200` back from the HTTP server, Kubernetes marks the Pod Ready and starts routing traffic — before the cache is warm.

Every request that hits that Pod during the warmup window either fails or returns stale data.

### Why it's subtle

The Pod passes its readiness probe. The rollout waits for readiness before proceeding. Everything looks correct. The failure is in what "ready" means.

### The fix

Add a dedicated `/ready` endpoint that reflects actual application readiness — not just process liveness.

```go
var cacheWarmed atomic.Bool

func readyHandler(w http.ResponseWriter, r *http.Request) {
    if !cacheWarmed.Load() {
        http.Error(w, "cache not warmed", http.StatusServiceUnavailable)
        return
    }
    w.WriteHeader(http.StatusOK)
}
```

```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 3
```

The probe returns `503` until the cache is warm. Kubernetes won't mark the Pod Ready — and won't terminate the old Pod — until `/ready` returns `200`.

A useful rule: your readiness probe should return `200` only when the Pod can correctly handle 100% of the requests it will receive. Not just when it's alive.

---

## Case 3 — Endpoint propagation lag causes requests to reach terminating Pods

### What happens

When Kubernetes decides to terminate a Pod, it removes it from the Service's endpoint list. But this removal has to propagate through the cluster — through the API server, to kube-proxy on every node, to iptables/ipvs rules.

That propagation takes time. Typically 1–10 seconds depending on cluster size and load.

During that window, kube-proxy on some nodes still has the old iptables rules. Requests from those nodes are still routed to the Pod that's already receiving `SIGTERM`.

### Why it's subtle

From Kubernetes' perspective, it did everything correctly: it removed the Pod from endpoints before terminating it. The lag is in the propagation, not the decision. There's no Kubernetes configuration that eliminates this — it's a fundamental property of distributed systems.

### The fix

A `preStop` hook that sleeps before the shutdown sequence begins, giving the cluster time to propagate the endpoint removal.

```yaml
lifecycle:
  preStop:
    exec:
      command: ["sleep", "10"]
```

The sequence with this hook:
1. Kubernetes decides to terminate the Pod
2. Removes Pod from endpoints (propagation begins)
3. Executes `preStop` hook — sleeps 10 seconds
4. Propagation completes during the sleep
5. `SIGTERM` is sent — no more traffic is arriving
6. Application shuts down cleanly

The sleep value depends on your cluster. 5–15 seconds covers most cases. If you have Prometheus or other scrapers hitting the Pod, account for their scrape interval too.

**Important:** `terminationGracePeriodSeconds` includes the `preStop` duration. If your grace period is 30 seconds and `preStop` sleeps for 10, you have 20 seconds left for graceful shutdown.

---

## Case 4 — The application doesn't handle SIGTERM gracefully

### What happens

After `preStop` completes, Kubernetes sends `SIGTERM` to the application process. Many applications — especially those that started as scripts or that use frameworks with default settings — simply exit on `SIGTERM`.

Any request in flight at that moment is cut off mid-execution. The client receives a connection reset, which typically surfaces as a 502 or 503.

### Why it's subtle

This is an application problem, not a Kubernetes problem. Kubernetes did everything right — it used a rolling update, waited for readiness, ran `preStop`, and then sent `SIGTERM`. The application is responsible for what happens next.

### The fix

Implement graceful shutdown: stop accepting new connections, finish in-flight requests, then exit.

```javascript
process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0)
  })
  // Force exit if connections don't close in time
  setTimeout(() => process.exit(1), 25000)
})
```

The shutdown timeout (25 seconds in these examples) should be less than `terminationGracePeriodSeconds` minus `preStop` sleep — so the application exits cleanly before Kubernetes sends `SIGKILL`.

---

## Case 5 — terminationGracePeriodSeconds is shorter than your longest requests

### What happens

Even with graceful shutdown implemented, Kubernetes enforces a hard deadline: `terminationGracePeriodSeconds`. When it expires, Kubernetes sends `SIGKILL`. The process is killed immediately. Any request still in flight is cut off.

The default is 30 seconds. If your application has legitimate long-running requests — file uploads, batch operations, report generation, database migrations — 30 seconds may not be enough.

### Why it's subtle

This only affects requests at the tail of your latency distribution. Your p50 and p95 requests finish in time. It's the p99.9 requests — the ones that legitimately take 45 or 60 seconds — that get killed.

These are rare enough that they don't show up in normal monitoring. They surface during rollouts, when the timing aligns perfectly with a long-running request and a terminating Pod.

### The fix

Set `terminationGracePeriodSeconds` to be longer than your actual p99.9 request latency.

```yaml
spec:
  terminationGracePeriodSeconds: 90
```

If you don't know your p99.9 latency by endpoint, now is a good time to add that instrumentation. You need it for this, and you'll need it for capacity planning anyway.

The math: `terminationGracePeriodSeconds` should be at least `preStop sleep + graceful shutdown timeout + some buffer`. If `preStop` sleeps for 10 seconds and graceful shutdown times out at 60 seconds, set `terminationGracePeriodSeconds` to at least 75–80 seconds.

---

## The complete configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0       # Case 1: never reduce capacity
      maxSurge: 1
  template:
    spec:
      terminationGracePeriodSeconds: 90   # Case 5: longer than p99.9 latency
      containers:
        - name: api
          readinessProbe:
            httpGet:
              path: /ready              # Case 2: reflects actual readiness
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3
          lifecycle:
            preStop:
              exec:
                command: ["sleep", "10"]  # Case 3: endpoint propagation lag
          # Case 4: graceful SIGTERM handling is in application code
```

Five independent failure modes. Each one looks correct in isolation. All five have to be in place simultaneously.

---

## Why Kubernetes doesn't enforce this for you

Each of these cases involves a boundary that Kubernetes deliberately doesn't own:

- **Case 1** — the default strategy is intentionally permissive. Most workloads don't need `maxUnavailable: 0`.
- **Case 2** — Kubernetes has no way to know what "actually ready" means for your application. Only you know that.
- **Case 3** — propagation lag is a property of distributed systems. Kubernetes can't eliminate it; it can only give you tools to work around it.
- **Case 4** — graceful shutdown is application behavior. Kubernetes sends `SIGTERM` and waits. What the application does next is up to the application.
- **Case 5** — Kubernetes doesn't know your latency distribution. Only you do.

Zero downtime during a rollout isn't something Kubernetes gives you. It's something you build, across your infrastructure configuration and your application code, deliberately.

`deployment "api" successfully rolled out` means the rollout completed. It says nothing about what your users experienced.