import { Link } from 'react-router-dom'
import posts from '../content/posts.json'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function getYear(dateStr) {
  return new Date(dateStr).getFullYear()
}

export default function Blog() {
  // Group posts by year
  const grouped = posts.reduce((acc, post) => {
    const year = getYear(post.date)
    if (!acc[year]) acc[year] = []
    acc[year].push(post)
    return acc
  }, {})

  const years = Object.keys(grouped).sort((a, b) => b - a)

  return (
    <main style={{ flex: 1 }}>
      <div className="container--wide">
        <div className="page-header">
          <h1>Writing</h1>
          <p>Thoughts on observability, reliability, distributed systems, and the craft of engineering.</p>
        </div>

        <div className="blog-list">
          {years.map(year => (
            <div key={year} className="blog-group">
              <p className="blog-group-year">{year}</p>
              <ul className="post-list">
                {grouped[year].map(post => (
                  <li key={post.slug} className="post-item">
                    <Link to={`/blogs/${post.slug}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1.5rem', width: '100%' }}>
                      <div className="post-item-left">
                        <p className="post-item-title">{post.title}</p>
                        <p className="post-item-desc">{post.description}</p>
                      </div>
                      <span className="post-item-date">{formatDate(post.date)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
