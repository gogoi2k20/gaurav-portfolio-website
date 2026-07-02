Every few months someone publishes a hot take that "observability is just monitoring with a fancier name." I've been in enough 3am incidents to know that's wrong — but I've also seen teams invest heavily in observability tooling and still be completely blind when things break. The difference usually isn't the tools. It's the mental model.

## The control theory definition actually matters

Observability comes from control theory. A system is observable if you can determine its internal state from its external outputs. That's it. No mention of logs, metrics, or traces.

Monitoring, by contrast, is about watching for known failure modes. You define thresholds — CPU above 80%, error rate above 1%, latency above 500ms — and you get paged when they're crossed. Monitoring answers questions you already know to ask.

> Monitoring tells you when something is wrong. Observability lets you figure out *why* — including for failure modes you didn't anticipate when you wrote the alert.

The reason this matters in practice: distributed systems fail in ways you didn't predict. A timeout cascade that only happens when three specific microservices are slow simultaneously. A memory leak triggered by a rare combination of request parameters. You can't write an alert for something you haven't imagined yet.

## The three pillars are a taxonomy, not a checklist

Metrics, logs, and traces are everywhere in observability conversations. They're a useful taxonomy of signal types, but treating them as a checklist — "we have all three, therefore we're observable" — is where teams go wrong.

I've worked with systems that had all three and were still effectively unobservable. Metrics that measured the wrong things. Logs that were verbose noise with no correlation IDs. Traces that covered 30% of the request path and silently dropped the rest.

What matters isn't having all three. It's being able to answer arbitrary questions about your system's behavior.

## What actually makes a system observable

In practice, I think about observability along a few dimensions that aren't usually in the vendor slide decks:

**Correlation.** Can you take a single request ID and follow it across every service, every queue, every database call, in a single query? If not, you're doing archaeology when you should be doing investigation.

**High cardinality.** Can you slice your data by arbitrary user IDs, tenant IDs, feature flags, or deployment versions? Metrics that only support low-cardinality labels will fail you when you need to isolate "why is this one customer seeing errors."

**High dimensionality.** Can you query by any combination of attributes, or are you limited to the dimensions you pre-defined? Pre-aggregated metrics force you to decide upfront what questions you'll want to ask.

**Freshness.** How old is the data by the time you can query it? A two-minute scrape interval is fine for capacity planning, terrible for incident response.

## A concrete example

Say your p99 latency alert fires at 2am. With monitoring alone, you know something is slow. You start checking dashboards — CPU fine, memory fine, database connections fine. You're guessing.

With a properly observable system, you'd start from the trace. You'd look at the slowest requests in the last five minutes, see that they all share a specific `db.statement` attribute pointing to one query, correlate that with a recent deploy, and roll back. Twenty minutes instead of three hours.

```
// Fetch slow traces in the last 5 minutes
{
  service.name = "api-gateway",
  duration > 2000ms
}
| groupby db.statement
| p99(duration)
| sort desc
| limit 20
```

The power isn't the query language. It's that you can run this without knowing which `db.statement` you were looking for. The system lets you discover the cause rather than confirm a hypothesis.

## Where I think teams should focus

If I were advising a team starting from scratch, here's the order I'd prioritize:

1. Get structured logs with request correlation IDs flowing everywhere, before anything else.
2. Add distributed tracing with full coverage — partial coverage is deceptive.
3. Build metrics around your SLOs, not your implementation. Measure what users experience.
4. Invest in a query interface that supports high cardinality.
5. Write runbooks that assume you'll use your observability tooling — this forces you to validate it works while things are calm.

Observability isn't a feature you add to a system. It's a property of how you build it. And unlike performance or reliability, it only pays off when things go wrong — which is exactly when you need it most.
