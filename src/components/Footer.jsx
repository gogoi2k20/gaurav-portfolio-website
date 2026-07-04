import profile from '../content/profile.json'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="inner">
        <p className="footer-note">© {new Date().getFullYear()} {profile.name}. Built with React.</p>
        <div className="footer-links">
          <a href={profile.github} target="_blank" rel="noopener">GitHub</a>
          {/* <a href={profile.twitter} target="_blank" rel="noopener">Twitter</a> */}
          <a href={`mailto:${profile.email}`}>Email</a>
        </div>
      </div>
    </footer>
  )
}
