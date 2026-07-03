import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import posts from '../content/posts.json'

// Import all markdown files eagerly via Vite's import.meta.glob
const markdownFiles = import.meta.glob('../content/posts/*.md', { query: '?raw', import: 'default' })

function formatDateLong(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

export default function Post() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)

  const meta = posts.find(p => p.slug === slug)

  useEffect(() => {
    if (!meta) {
      navigate('/404', { replace: true })
      return
    }

    const key = `../content/posts/${slug}.md`
    if (markdownFiles[key]) {
      markdownFiles[key]().then(md => {
        setContent(md)
        setLoading(false)
      })
    } else {
      setContent(null)
      setLoading(false)
    }
  }, [slug, meta, navigate])

  if (!meta) return null

  return (
    <main style={{ flex: 1 }}>
      <div className="container">
        {/* Post header */}
        <div className="post-header">
          <div className="post-meta">
            <span className="post-meta-date">{formatDateLong(meta.date)}</span>
            <span className="post-meta-tag">{meta.tag}</span>
          </div>
          <h1 className="post-title">{meta.title}</h1>
          <p className="post-subtitle">{meta.description}</p>
        </div>

        {/* Post body */}
        <article className="post-body">
          {loading && (
            <p style={{ color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: '0.875rem' }}>
              Loading...
            </p>
          )}
          {!loading && content && <ReactMarkdown>{content}</ReactMarkdown>}
          {!loading && !content && (
            <p style={{ color: 'var(--text-2)' }}>
              This post is coming soon.
            </p>
          )}
        </article>

        {/* Post footer */}
        <div className="post-footer">
          <Link to="/blogs" className="back-link">← All posts</Link>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(meta.title)}`}
            target="_blank"
            rel="noopener"
            className="back-link"
          >
            Share on Twitter →
          </a>
        </div>
      </div>
    </main>
  )
}
