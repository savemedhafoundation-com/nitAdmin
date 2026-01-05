import nitlogo from "../assets/NIT LOGO_1.png"
const BlogHeader = ({ totalBlogs, isEditing }) => {

  return (
    <header className="header">
      <div className="header-content">
        <img src={nitlogo} alt="NIT logo" className="nit-logo" />
        <p className="kicker">NIT Admin</p>
        <h1>Blog Studio</h1>
        <p className="subtitle">Curate stories, set the tone, and keep your blog feed fresh.</p>
      </div>
      <div className="stats">
        <div>
          <span>Total blogs</span>
          <strong>{totalBlogs}</strong>
        </div>
        <div>
          <span>Active mode</span>
          <strong>{isEditing ? 'Editing' : 'Creating'}</strong>
        </div>
      </div>
    </header>
  )
}

export default BlogHeader
