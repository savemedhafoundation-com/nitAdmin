import { useState } from 'react'

const BlogLibraryPanel = ({
  loading,
  blogs,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  onSelectBlog,
  onDeleteBlog,
  currentPage,
  totalPages,
  onPageChange,
  onLikeBlog,
  onShareBlog,
}) => {
  const [expandedComments, setExpandedComments] = useState({})
  const [previewBlog, setPreviewBlog] = useState(null)

  const toggleComments = blogId => {
    setExpandedComments(prev => ({ ...prev, [blogId]: !prev[blogId] }))
  }

  const stripHtml = value => {
    if (!value) return ''
    return value.replace(/<(.|\n)*?>/g, '').trim()
  }

  const buildExcerpt = (value, maxLength = 160) => {
    if (!value) return ''
    if (value.length <= maxLength) return value
    return `${value.slice(0, maxLength).trim()}...`
  }

  return (
    <div className="panel list-panel">
      <div className="panel-header">
        <h2>Library</h2>
        <form className="search" onSubmit={onSearch}>
          <input
            type="text"
            placeholder="Search blogs"
            value={searchQuery}
            onChange={event => onSearchQueryChange(event.target.value)}
          />
          <button type="submit" disabled={loading}>
            Search
          </button>
        </form>
      </div>

      <div className="list">
        {loading && <p className="hint">Loading...</p>}
        {!loading && blogs.length === 0 && <p className="hint">No blogs found yet.</p>}
        {blogs.map(blog => (
          <article className="blog-card" key={blog._id}>
            <img
              className="blog-thumb"
              src={blog.imageUrl}
              alt={blog.title || 'Blog image'}
              loading="lazy"
            />
            <div className="blog-content">
              <div className="blog-main">
                <div className="blog-text">
                  <h3 className="blog-title">{blog.title}</h3>
                  <p className="blog-excerpt">
                    {buildExcerpt(stripHtml(blog.description))}
                  </p>
                </div>
                <span className="blog-pill">
                  {[blog.category, blog.subCategory].filter(Boolean).join(' / ') || 'General'}
                </span>
              </div>
              <div className="blog-meta-row">
                <span>By {blog.writtenBy || 'Unknown'}</span>
                <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
                <button
                  type="button"
                  className="comment-toggle"
                  onClick={() => toggleComments(blog._id)}
                  disabled={!blog.comments || blog.comments.length === 0}
                >
                  {blog.comments?.length || 0} comments
                </button>
              </div>
              <div className="blog-tags-row">
                {Array.isArray(blog.metadata) && blog.metadata.length > 0 && (
                  <span>Tags: {blog.metadata.join(', ')}</span>
                )}
                {blog.cancerStage && <span>Stage: {blog.cancerStage}</span>}
                <span>Views: {blog.viewsCount ?? 0}</span>
                <span>Likes: {blog.likesCount ?? 0}</span>
                <span>Shares: {blog.sharesCount ?? 0}</span>
              </div>
              {expandedComments[blog._id] && blog.comments?.length > 0 && (
                <ul className="comment-list">
                  {blog.comments.map(comment => (
                    <li key={comment._id || `${blog._id}-${comment.createdAt}`}>
                      <p className="comment-text">{comment.comment}</p>
                      <p className="comment-meta">
                        {comment.name} - {comment.phoneNumber}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card-actions">
              <button type="button" onClick={() => onSelectBlog(blog)}>
                Edit
              </button>
              <button type="button" className="ghost" onClick={() => setPreviewBlog(blog)}>
                Preview
              </button>
              <button type="button" className="ghost" onClick={() => onLikeBlog(blog._id)}>
                Like
              </button>
              <button type="button" className="ghost" onClick={() => onShareBlog(blog._id)}>
                Share
              </button>
              <button type="button" className="ghost" onClick={() => onDeleteBlog(blog._id)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            className="ghost"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            className="ghost"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {previewBlog && (
        <div className="preview-panel">
          <div className="preview-card">
            <div className="preview-header">
              <h3>{previewBlog.title}</h3>
              <button type="button" className="ghost" onClick={() => setPreviewBlog(null)}>
                Close
              </button>
            </div>
            <div className="preview-body">
              <div className="preview-fields">
                <p>
                  <strong>Title:</strong> {previewBlog.title || '-'}
                </p>
                <p>
                  <strong>Category:</strong> {previewBlog.category || '-'}
                </p>
                <p>
                  <strong>Subcategory:</strong> {previewBlog.subCategory || '-'}
                </p>
                <p>
                  <strong>Written by:</strong> {previewBlog.writtenBy || '-'}
                </p>
                <p>
                  <strong>Cancer stage:</strong> {previewBlog.cancerStage || '-'}
                </p>
                <p>
                  <strong>Spotlight:</strong> {previewBlog.spotlight ? 'Yes' : 'No'}
                </p>
                <p>
                  <strong>Metadata:</strong>{' '}
                  {Array.isArray(previewBlog.metadata) && previewBlog.metadata.length > 0
                    ? previewBlog.metadata.join(', ')
                    : '-'}
                </p>
                <p>
                  <strong>Video links:</strong>{' '}
                  {Array.isArray(previewBlog.videoLinks) && previewBlog.videoLinks.length > 0
                    ? previewBlog.videoLinks.join(', ')
                    : '-'}
                </p>
                <p>
                  <strong>Likes:</strong> {previewBlog.likesCount ?? 0}
                </p>
                <p>
                  <strong>Shares:</strong> {previewBlog.sharesCount ?? 0}
                </p>
                <p>
                  <strong>Views:</strong> {previewBlog.viewsCount ?? 0}
                </p>
              </div>
              <img
                className="preview-main"
                src={previewBlog.imageUrl}
                alt={previewBlog.title || 'Blog image'}
              />
              {Array.isArray(previewBlog.blogImage) && previewBlog.blogImage.length > 0 && (
                <div className="preview-gallery">
                  {previewBlog.blogImage.map((item, index) => (
                    <img
                      key={`${previewBlog._id}-gallery-${index}`}
                      src={item.imageUrl || item}
                      alt={`Blog image ${index + 1}`}
                    />
                  ))}
                </div>
              )}
              <div
                className="preview-description"
                dangerouslySetInnerHTML={{ __html: previewBlog.description || '' }}
              />
              {previewBlog.adminStatement && (
                <div className="preview-admin">
                  <h4>Admin statement</h4>
                  <p>
                    <strong>Quotation:</strong> {previewBlog.adminStatement.quotation || '-'}
                  </p>
                  <p>
                    <strong>Name:</strong> {previewBlog.adminStatement.name || '-'}
                  </p>
                  <p>
                    <strong>Designation:</strong> {previewBlog.adminStatement.designation || '-'}
                  </p>
                </div>
              )}
              {Array.isArray(previewBlog.faqs) && previewBlog.faqs.length > 0 && (
                <div className="preview-faqs">
                  <h4>FAQs</h4>
                  <ul>
                    {previewBlog.faqs.map((faq, index) => (
                      <li key={`${previewBlog._id}-faq-${index}`}>
                        <strong>Q:</strong> {faq.question || '-'}
                        <br />
                        <strong>A:</strong> {faq.answer || '-'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BlogLibraryPanel
