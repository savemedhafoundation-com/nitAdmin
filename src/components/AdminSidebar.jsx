import nitlogo from '../assets/NIT LOGO_1.png'

const navItems = [
  {
    id: 'blogs',
    label: 'Blogs',
    description: 'Manage blog library and editor',
  },
  {
    id: 'case-studies',
    label: 'Case Studies',
    description: 'Create research case study forms',
  },
]

const AdminSidebar = ({ activeView, onNavigate }) => {
  return (
    <aside className="side-panel">
      <div className="side-brand">
        <img src={nitlogo} alt="NIT logo" className="nit-logo side-logo" />
        <p className="kicker">NIT Admin</p>
      </div>

      <nav className="side-nav" aria-label="Admin sections">
        {navItems.map(item => (
          <button
            key={item.id}
            type="button"
            title={item.label}
            className={`side-nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <strong>{item.label}</strong>
            <span>{item.description}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}

export default AdminSidebar
