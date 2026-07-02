import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="not-found">
        <p className="not-found-code">404</p>
        <h1>Page not found</h1>
        <p>This URL doesn't resolve to anything. Probably a dead link.</p>
        <Link to="/" className="btn btn--primary">← Back home</Link>
      </div>
    </main>
  )
}
