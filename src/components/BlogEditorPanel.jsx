import ReactQuill from 'react-quill-new'
import { quillFormats, quillModules } from '../utils/quillConfig'

const BlogEditorPanel = ({
  selectedId,
  onReset,
  onSubmit,
  isSaving,
  form,
  onInputChange,
  onSpotlightChange,
  onDescriptionChange,
  categories,
  selectedCategoryId,
  subcategories,
  selectedSubcategoryId,
  onCategorySelect,
  onSubcategorySelect,
  newCategoryName,
  onNewCategoryNameChange,
  onAddCategory,
  newSubcategoryName,
  onNewSubcategoryNameChange,
  onAddSubcategory,
  onFileChange,
  faqs,
  onFaqChange,
  onAddFaq,
  onRemoveFaq,
  status,
  loading,
}) => {
  return (
    <div className="panel form-panel">
      <div className="panel-header">
        <h2>{selectedId ? 'Edit blog' : 'Create blog'}</h2>
        <button type="button" className="ghost" onClick={onReset}>
          Reset
        </button>
      </div>

      <form className="blog-form" onSubmit={onSubmit}>
        {isSaving && (
          <div className="loading-bar" role="status" aria-live="polite">
            <span />
          </div>
        )}
        <div className="grid">
          <label>
            Title
            <input name="title" title="Title" value={form.title} onChange={onInputChange} required />
          </label>
          <label>
            Written by
            <input
              name="writtenBy"
              title="Written by"
              value={form.writtenBy}
              onChange={onInputChange}
              required
            />
          </label>
          <label>
            Category
            <select title="Category" value={selectedCategoryId} onChange={onCategorySelect} required>
              <option value="">Select category</option>
              {categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sub-category
            <select title="Sub-category" value={selectedSubcategoryId} onChange={onSubcategorySelect}>
              <option value="">Select subcategory</option>
              {subcategories.map(subcategory => (
                <option key={subcategory._id} value={subcategory._id}>
                  {subcategory.name}
                </option>
              ))}
            </select>
          </label>
          <div className="category-actions">
            <label>
              New category
              <input
                title="New category"
                value={newCategoryName}
                onChange={event => onNewCategoryNameChange(event.target.value)}
                placeholder="Add category"
              />
            </label>
            <button type="button" className="ghost" onClick={onAddCategory} disabled={loading}>
              Add category
            </button>
          </div>
          <div className="category-actions">
            <label>
              New subcategory
              <input
                title="New subcategory"
                value={newSubcategoryName}
                onChange={event => onNewSubcategoryNameChange(event.target.value)}
                placeholder="Add subcategory"
              />
            </label>
            <button
              type="button"
              className="ghost"
              onClick={onAddSubcategory}
              disabled={loading || !selectedCategoryId}
            >
              Add subcategory
            </button>
          </div>
          <label>
            Cancer stage
            <select
              name="cancerStage"
              title="Cancer stage"
              value={form.cancerStage}
              onChange={onInputChange}
            >
              <option value="ANY">ANY</option>
              <option value="IN TREATMENT">IN TREATMENT</option>
              <option value="NEWLY TREATMENT">NEWLY TREATMENT</option>
              <option value="POST TREATMENT">POST TREATMENT</option>
            </select>
          </label>
          <label>
            Metadata (comma separated)
            <input name="metadata" title="Metadata" value={form.metadata} onChange={onInputChange} />
          </label>
          <label>
            Video links (comma separated)
            <input
              name="videoLinks"
              title="Video links"
              value={form.videoLinks}
              onChange={onInputChange}
            />
          </label>
          <label className="checkbox">
            <span>Spotlight</span>
            <input type="checkbox" title="Spotlight" checked={form.spotlight} onChange={onSpotlightChange} />
          </label>
        </div>

        <label>
          Description  (try to place "AdminStatement", "youtubevideo", "image1" in the description to get proper placing)
          <ReactQuill
            theme="snow"
            value={form.description}
            onChange={onDescriptionChange}
            title="Description"
            modules={quillModules}
            formats={quillFormats}
          />
        </label>

        <div className="grid">
          <label>
            Main image
            <input
              type="file"
              title="Main image"
              accept="image/*"
              onChange={event => onFileChange('image', event.target.files?.[0] || null)}
            />
          </label>
          <label>
            Admin photo (optional)
            <input
              type="file"
              title="Admin photo"
              accept="image/*"
              onChange={event => onFileChange('adminPhoto', event.target.files?.[0] || null)}
            />
          </label>
          <label className="full">
            Blog images (exactly two)
            <input
              type="file"
              title="Blog images"
              accept="image/*"
              multiple
              onChange={event => onFileChange('blogImage', Array.from(event.target.files || []))}
            />
          </label>
        </div>

        <div className="admin-statement">
          <h3>Admin statement</h3>
          <div className="grid">
            <label>
              Quotation
              <input
                name="adminQuotation"
                title="Admin quotation"
                value={form.adminQuotation}
                onChange={onInputChange}
              />
            </label>
            <label>
              Name
              <input name="adminName" title="Admin name" value={form.adminName} onChange={onInputChange} />
            </label>
            <label>
              Designation
              <input
                name="adminDesignation"
                title="Admin designation"
                value={form.adminDesignation}
                onChange={onInputChange}
              />
            </label>
          </div>
        </div>

        <div className="faqs">
          <div className="panel-header">
            <h3>FAQs</h3>
            <button type="button" className="ghost" onClick={onAddFaq}>
              Add FAQ
            </button>
          </div>
          {faqs.map((faq, index) => (
            <div className="faq-item" key={`faq-${index}`}>
              <label>
                Question
                <input
                  title="FAQ question"
                  value={faq.question}
                  onChange={event => onFaqChange(index, 'question', event.target.value)}
                />
              </label>
              <label>
                Answer
                <input
                  title="FAQ answer"
                  value={faq.answer}
                  onChange={event => onFaqChange(index, 'answer', event.target.value)}
                />
              </label>
              {faqs.length > 1 && (
                <button type="button" className="ghost" onClick={() => onRemoveFaq(index)}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        {status.message && <p className={`status ${status.type}`}>{status.message}</p>}

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {selectedId ? 'Update blog' : 'Publish blog'}
          </button>
          <button type="button" className="ghost" onClick={onReset} disabled={loading}>
            Clear
          </button>
        </div>
      </form>
    </div>
  )
}

export default BlogEditorPanel
