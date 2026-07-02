# gauravgogoi.dev

Personal portfolio and blog. Built with React + Vite, deployed on Cloudflare Pages.

## Running locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Publishing a new post

**Step 1 — Write the content**

Create a markdown file in `src/content/posts/`:

```
src/content/posts/your-post-slug.md
```

Write in plain markdown. Supports headings, code blocks, blockquotes, bold, lists — everything standard.

**Step 2 — Register the post**

Add an entry to `src/content/posts.json`:

```json
{
  "slug": "your-post-slug",
  "title": "Your post title",
  "description": "One sentence shown on the blog listing page.",
  "date": "2025-07-10",
  "tag": "observability"
}
```

The `slug` must exactly match the filename (without `.md`). The `date` controls ordering — newest first.

That's it. The post appears on `/blogs` and is live at `/blogs/your-post-slug`.

## Hiding a post

Remove (or comment out) its entry from `posts.json`. The `.md` file can stay — it just won't be linked anywhere.

## Deploying

```bash
npm run build   # outputs to /dist
```

Cloudflare Pages auto-deploys on every push to `main` if connected to GitHub. Build command: `npm run build`. Output directory: `dist`.
