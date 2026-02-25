const stripHtml = value => {
  if (!value) return ''
  return String(value).replace(/<(.|\n)*?>/g, '').trim()
}

const buildExcerpt = (value, maxLength = 180) => {
  const text = stripHtml(value)
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}...`
}

const formatDate = value => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString()
}

const CaseStudyLibraryPanel = ({ loading, caseStudies, onEdit, onDelete }) => {
  return (
    <div className="panel case-study-list-panel">
      <div className="panel-header">
        <h2>Case Study Library</h2>
      </div>

      <div className="list">
        {loading && <p className="hint">Loading case studies...</p>}
        {!loading && caseStudies.length === 0 && <p className="hint">No case studies found yet.</p>}

        {caseStudies.map(item => (
          <article className="case-study-card" key={item._id}>
            <div className="case-study-main">
              <div className="case-study-text">
                <h3>{item.title || 'Untitled case study'}</h3>
                <p>{buildExcerpt(item.abstract || item.introduction || item.discussion)}</p>
                <div className="case-study-meta">
                  <span>Status: {item.status || 'draft'}</span>
                  <span>Created: {formatDate(item.createdAt)}</span>
                </div>
              </div>

              <div className="case-study-image-box">
                {Array.isArray(item.result?.images) && item.result.images.length > 0 ? (
                  item.result.images.slice(0, 4).map((image, index) => (
                    <img
                      key={`${item._id}-image-${index}`}
                      src={image.url}
                      alt={image.altText || image.caption || `Case study image ${index + 1}`}
                      loading="lazy"
                    />
                  ))
                ) : (
                  <div className="case-study-image-empty">No images</div>
                )}
              </div>
            </div>

            <div className="case-study-actions">
              <button type="button" onClick={() => onEdit(item)}>
                Edit
              </button>
              <button type="button" className="ghost" onClick={() => onDelete(item)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export default CaseStudyLibraryPanel
