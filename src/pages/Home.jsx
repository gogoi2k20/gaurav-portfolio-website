import { Link } from 'react-router-dom'
import profile from '../content/profile.json'
import posts from '../content/posts.json'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export default function Home() {
  const recent = posts.slice(0, 4)

  return (
    <main style={{ flex: 1 }}>
      {/* Hero */}
      <div className="container--wide">
        <section className="hero">
          <p className="hero-tag">{profile.title}</p>
          <h1>{profile.tagline}</h1>
          <p className="hero-bio">{profile.bio}</p>
          <div className="hero-links">
            <Link to="/blogs" className="btn btn--primary">Read my writing →</Link>
            <a href={`mailto:${profile.email}`} className="btn">Get in touch</a>
          </div>
          <div className="stack">
            <span className="stack-label">Stack</span>
            {profile.stack.map(s => <span key={s} className="pill">{s}</span>)}
          </div>
        </section>
      </div>

      {/* Recent writing */}
      <div className="container--wide">
        <section className="section">
          <p className="section-label">Recent writing</p>
          <ul className="post-list">
            {recent.map(post => (
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
          <div style={{ marginTop: '1.5rem' }}>
            <Link to="/blogs" className="back-link">All posts →</Link>
          </div>
        </section>
      </div>

      {/* Work */}
      <div className="container--wide">
        <section className="section" id="work">
          <p className="section-label">Work</p>
          <div>
            {profile.work.map((w, i) => (
              <div key={i} className="work-item">
                <div>
                  <p className="work-role">{w.role}</p>
                  <p className="work-company">{w.company}</p>
                </div>
                <p className="work-period">{w.period}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
