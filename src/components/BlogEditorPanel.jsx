import ReactQuill from 'react-quill'

const quillModules = {
  toolbar: [
    [{ size: ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['clean'],
  ],
}

const quillFormats = [
  'size',
  'bold',
  'italic',
  'underline',
  'color',
  'background',
  'list',
  'bullet',
  'indent',
]

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
            <input name="title" value={form.title} onChange={onInputChange} required />
          </label>
          <label>
            Written by
            <input name="writtenBy" value={form.writtenBy} onChange={onInputChange} required />
          </label>
          <label>
            Category
            <select value={selectedCategoryId} onChange={onCategorySelect} required>
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
            <select value={selectedSubcategoryId} onChange={onSubcategorySelect}>
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
            <select name="cancerStage" value={form.cancerStage} onChange={onInputChange}>
              <option value="ANY">ANY</option>
              <option value="IN TREATMENT">IN TREATMENT</option>
              <option value="NEWLY TREATMENT">NEWLY TREATMENT</option>
              <option value="POST TREATMENT">POST TREATMENT</option>
            </select>
          </label>
          <label>
            Metadata (comma separated)
            <input name="metadata" value={form.metadata} onChange={onInputChange} />
          </label>
          <label>
            Video links (comma separated)
            <input name="videoLinks" value={form.videoLinks} onChange={onInputChange} />
          </label>
          <label className="checkbox">
            <span>Spotlight</span>
            <input type="checkbox" checked={form.spotlight} onChange={onSpotlightChange} />
          </label>
        </div>

        <label>
          Description  (try to place "AdminStatement", "youtubevideo", "image1" in the description to get proper placing)
          <ReactQuill
            theme="snow"
            value={form.description}
            onChange={onDescriptionChange}
            modules={quillModules}
            formats={quillFormats}
          />
        </label>

        <div className="grid">
          <label>
            Main image
            <input
              type="file"
              accept="image/*"
              onChange={event => onFileChange('image', event.target.files?.[0] || null)}
            />
          </label>
          <label>
            Admin photo (optional)
            <input
              type="file"
              accept="image/*"
              onChange={event => onFileChange('adminPhoto', event.target.files?.[0] || null)}
            />
          </label>
          <label className="full">
            Blog images (exactly two)
            <input
              type="file"
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
              <input name="adminQuotation" value={form.adminQuotation} onChange={onInputChange} />
            </label>
            <label>
              Name
              <input name="adminName" value={form.adminName} onChange={onInputChange} />
            </label>
            <label>
              Designation
              <input
                name="adminDesignation"
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
                  value={faq.question}
                  onChange={event => onFaqChange(index, 'question', event.target.value)}
                />
              </label>
              <label>
                Answer
                <input
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
