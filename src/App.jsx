import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import './App.css'

// const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://nitbackend.vercel.app/api'
const api = axios.create({ baseURL: API_BASE })

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

const isEmptyHtml = value => {
  if (!value) return true
  const stripped = value.replace(/<(.|\n)*?>/g, '').trim()
  return stripped.length === 0
}

const emptyForm = {
  title: '',
  description: '',
  metadata: '',
  videoLinks: '',
  spotlight: false,
  category: '',
  subCategory: '',
  cancerStage: 'ANY',
  writtenBy: '',
  adminQuotation: '',
  adminName: '',
  adminDesignation: '',
}

function App() {
  const [blogs, setBlogs] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [faqs, setFaqs] = useState([{ question: '', answer: '' }])
  const [files, setFiles] = useState({ image: null, adminPhoto: null, blogImage: [] })
  const [selectedId, setSelectedId] = useState(null)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newSubcategoryName, setNewSubcategoryName] = useState('')

  const totalBlogs = useMemo(() => blogs.length, [blogs])
  const selectedCategory = useMemo(
    () => categories.find(category => category._id === selectedCategoryId),
    [categories, selectedCategoryId]
  )
  const subcategories = selectedCategory?.subcategories || []

  const resetForm = () => {
    setForm(emptyForm)
    setFaqs([{ question: '', answer: '' }])
    setFiles({ image: null, adminPhoto: null, blogImage: [] })
    setSelectedId(null)
    setSelectedCategoryId('')
    setSelectedSubcategoryId('')
    setNewCategoryName('')
    setNewSubcategoryName('')
  }

  const normalizeBlogList = payload => {
    if (Array.isArray(payload)) return payload
    if (payload && Array.isArray(payload.data)) return payload.data
    return []
  }

  const normalizeCategoryList = payload => {
    if (payload && Array.isArray(payload.data)) return payload.data
    return []
  }

  const loadBlogs = async (query = '') => {
    setLoading(true)
    setStatus({ type: '', message: '' })

    try {
      const url = query
        ? `${API_BASE}/blogs/search?q=${encodeURIComponent(query)}`
        : `${API_BASE}/blogs?limit=50`
      const { data: payload } = await api.get(url.replace(API_BASE, ''))
      setBlogs(normalizeBlogList(payload))
    } catch (error) {
      setStatus({ type: 'error', message: 'Unable to load blogs right now.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBlogs()
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const { data: payload } = await api.get('/blogs/categories')
      setCategories(normalizeCategoryList(payload))
    } catch (error) {
      setStatus({ type: 'error', message: 'Unable to load categories right now.' })
    }
  }

  useEffect(() => {
    if (!form.category || selectedCategoryId) return
    const match = categories.find(
      category => category.name?.toLowerCase() === form.category.toLowerCase()
    )
    if (match) {
      setSelectedCategoryId(match._id)
    }
  }, [categories, form.category, selectedCategoryId])

  useEffect(() => {
    if (!form.subCategory || selectedSubcategoryId || !selectedCategory) return
    const match = selectedCategory.subcategories?.find(
      sub => sub.name?.toLowerCase() === form.subCategory.toLowerCase()
    )
    if (match) {
      setSelectedSubcategoryId(match._id)
    }
  }, [form.subCategory, selectedCategory, selectedSubcategoryId])

  const handleInputChange = event => {
    const { name, value } = event.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleFaqChange = (index, field, value) => {
    setFaqs(prev =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    )
  }

  const addFaq = () => {
    setFaqs(prev => [...prev, { question: '', answer: '' }])
  }

  const removeFaq = index => {
    setFaqs(prev => prev.filter((_, idx) => idx !== index))
  }

  const handleFileChange = (key, value) => {
    setFiles(prev => ({ ...prev, [key]: value }))
  }

  const selectBlog = blog => {
    setSelectedId(blog._id)
    setForm({
      title: blog.title || '',
      description: blog.description || '',
      metadata: Array.isArray(blog.metadata) ? blog.metadata.join(', ') : '',
      videoLinks: Array.isArray(blog.videoLinks) ? blog.videoLinks.join(', ') : '',
      spotlight: Boolean(blog.spotlight),
      category: blog.category || '',
      subCategory: blog.subCategory || '',
      cancerStage: blog.cancerStage || 'ANY',
      writtenBy: blog.writtenBy || '',
      adminQuotation: blog.adminStatement?.quotation || '',
      adminName: blog.adminStatement?.name || '',
      adminDesignation: blog.adminStatement?.designation || '',
    })
    setFaqs(
      Array.isArray(blog.faqs) && blog.faqs.length > 0
        ? blog.faqs.map(item => ({ question: item.question || '', answer: item.answer || '' }))
        : [{ question: '', answer: '' }]
    )
    setFiles({ image: null, adminPhoto: null, blogImage: [] })
    setSelectedCategoryId('')
    setSelectedSubcategoryId('')
  }

  const handleSubmit = async event => {
    event.preventDefault()
    setStatus({ type: '', message: '' })

    if (!form.title || isEmptyHtml(form.description) || !form.category || !form.writtenBy) {
      setStatus({ type: 'error', message: 'Title, description, category, and author are required.' })
      return
    }

    if (!selectedId && !files.image) {
      setStatus({ type: 'error', message: 'Main image is required for new blogs.' })
      return
    }

    if (!selectedId && files.blogImage.length !== 2) {
      setStatus({ type: 'error', message: 'Upload exactly two blog images.' })
      return
    }

    if (selectedId && files.blogImage.length > 0 && files.blogImage.length !== 2) {
      setStatus({ type: 'error', message: 'When updating, provide both blog images.' })
      return
    }

    try {
      setIsSaving(true)
      setLoading(true)
      const formData = new FormData()
      formData.append('title', form.title)
      formData.append('description', form.description)
      formData.append('metadata', form.metadata)
      formData.append('videoLinks', form.videoLinks)
      formData.append('spotlight', form.spotlight ? 'true' : 'false')
      formData.append('category', form.category)
      formData.append('subCategory', form.subCategory)
      formData.append('cancerStage', form.cancerStage)
      formData.append('writtenBy', form.writtenBy)

      const cleanedFaqs = faqs
        .map(item => ({
          question: item.question.trim(),
          answer: item.answer.trim(),
        }))
        .filter(item => item.question || item.answer)
      formData.append('faqs', JSON.stringify(cleanedFaqs))

      formData.append(
        'adminStatement',
        JSON.stringify({
          quotation: form.adminQuotation,
          name: form.adminName,
          designation: form.adminDesignation,
        })
      )

      if (files.image) {
        formData.append('image', files.image)
      }
      if (files.adminPhoto) {
        formData.append('adminPhoto', files.adminPhoto)
      }
      if (files.blogImage.length > 0) {
        files.blogImage.forEach(file => formData.append('blogImage', file))
      }

      const { data: payload } = await api.request({
        url: `/blogs${selectedId ? `/${selectedId}` : ''}`,
        method: selectedId ? 'PUT' : 'POST',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setStatus({ type: 'success', message: selectedId ? 'Blog updated.' : 'Blog created.' })
      resetForm()
      await loadBlogs(searchQuery)
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.message || error.message })
    } finally {
      setLoading(false)
      setIsSaving(false)
    }
  }

  const handleDelete = async blogId => {
    if (!blogId) return
    const confirmed = window.confirm('Are you sure you want to delete this blog?')
    if (!confirmed) return
    setLoading(true)
    setStatus({ type: '', message: '' })
    try {
      await api.delete(`/blogs/${blogId}`)
      setStatus({ type: 'success', message: 'Blog deleted.' })
      if (selectedId === blogId) resetForm()
      await loadBlogs(searchQuery)
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.message || error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = event => {
    event.preventDefault()
    loadBlogs(searchQuery.trim())
  }

  const handleCategorySelect = event => {
    const categoryId = event.target.value
    setSelectedCategoryId(categoryId)
    setSelectedSubcategoryId('')
    const category = categories.find(item => item._id === categoryId)
    setForm(prev => ({
      ...prev,
      category: category?.name || '',
      subCategory: '',
    }))
  }

  const handleSubcategorySelect = event => {
    const subcategoryId = event.target.value
    setSelectedSubcategoryId(subcategoryId)
    const subcategory = subcategories.find(item => item._id === subcategoryId)
    setForm(prev => ({
      ...prev,
      subCategory: subcategory?.name || '',
    }))
  }

  const handleAddCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) {
      setStatus({ type: 'error', message: 'Category name is required.' })
      return
    }
    try {
      setLoading(true)
      const { data: payload } = await api.post('/blogs/categories', { name })
      await loadCategories()
      setSelectedCategoryId(payload._id)
      setSelectedSubcategoryId('')
      setForm(prev => ({ ...prev, category: payload.name, subCategory: '' }))
      setNewCategoryName('')
      setStatus({ type: 'success', message: 'Category added.' })
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.message || error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleAddSubcategory = async () => {
    const name = newSubcategoryName.trim()
    if (!selectedCategoryId) {
      setStatus({ type: 'error', message: 'Select a category first.' })
      return
    }
    if (!name) {
      setStatus({ type: 'error', message: 'Subcategory name is required.' })
      return
    }
    try {
      setLoading(true)
      const { data: payload } = await api.post(
        `/blogs/categories/${selectedCategoryId}/subcategories`,
        { name }
      )
      await loadCategories()
      setSelectedSubcategoryId(payload._id)
      setForm(prev => ({ ...prev, subCategory: payload.name }))
      setNewSubcategoryName('')
      setStatus({ type: 'success', message: 'Subcategory added.' })
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.message || error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div>
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
            <strong>{selectedId ? 'Editing' : 'Creating'}</strong>
          </div>
        </div>
      </header>

      <section className="dashboard">
        <div className="panel list-panel">
          <div className="panel-header">
            <h2>Library</h2>
            <form className="search" onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search blogs"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
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
                <div>
                  <p className="tag">{blog.category || 'General'}</p>
                  <h3>{blog.title}</h3>
                  <p className="meta">
                    {blog.writtenBy || 'Unknown'} • {new Date(blog.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="card-actions">
                  <button type="button" onClick={() => selectBlog(blog)}>
                    Edit
                  </button>
                  <button type="button" className="ghost" onClick={() => handleDelete(blog._id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="panel form-panel">
          <div className="panel-header">
            <h2>{selectedId ? 'Edit blog' : 'Create blog'}</h2>
            <button type="button" className="ghost" onClick={resetForm}>
              Reset
            </button>
          </div>

          <form className="blog-form" onSubmit={handleSubmit}>
            {isSaving && (
              <div className="loading-bar" role="status" aria-live="polite">
                <span />
              </div>
            )}
            <div className="grid">
              <label>
                Title
                <input name="title" value={form.title} onChange={handleInputChange} required />
              </label>
              <label>
                Written by
                <input name="writtenBy" value={form.writtenBy} onChange={handleInputChange} required />
              </label>
              <label>
                Category
                <select value={selectedCategoryId} onChange={handleCategorySelect} required>
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
                <select value={selectedSubcategoryId} onChange={handleSubcategorySelect}>
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
                    onChange={event => setNewCategoryName(event.target.value)}
                    placeholder="Add category"
                  />
                </label>
                <button type="button" className="ghost" onClick={handleAddCategory} disabled={loading}>
                  Add category
                </button>
              </div>
              <div className="category-actions">
                <label>
                  New subcategory
                  <input
                    value={newSubcategoryName}
                    onChange={event => setNewSubcategoryName(event.target.value)}
                    placeholder="Add subcategory"
                  />
                </label>
                <button
                  type="button"
                  className="ghost"
                  onClick={handleAddSubcategory}
                  disabled={loading || !selectedCategoryId}
                >
                  Add subcategory
                </button>
              </div>
              <label>
                Cancer stage
                <select name="cancerStage" value={form.cancerStage} onChange={handleInputChange}>
                  <option value="ANY">ANY</option>
                  <option value="IN TREATMENT">IN TREATMENT</option>
                  <option value="NEWLY TREATMENT">NEWLY TREATMENT</option>
                  <option value="POST TREATMENT">POST TREATMENT</option>
                </select>
              </label>
              <label>
                Metadata (comma separated)
                <input name="metadata" value={form.metadata} onChange={handleInputChange} />
              </label>
              <label>
                Video links (comma separated)
                <input name="videoLinks" value={form.videoLinks} onChange={handleInputChange} />
              </label>
              <label className="checkbox">
                <span>Spotlight</span>
                <input
                  type="checkbox"
                  checked={form.spotlight}
                  onChange={event =>
                    setForm(prev => ({ ...prev, spotlight: event.target.checked }))
                  }
                />
              </label>
            </div>

            <label>
              Description
              <ReactQuill
                theme="snow"
                value={form.description}
                onChange={value => setForm(prev => ({ ...prev, description: value }))}
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
                  onChange={event => handleFileChange('image', event.target.files?.[0] || null)}
                />
              </label>
              <label>
                Admin photo (optional)
                <input
                  type="file"
                  accept="image/*"
                  onChange={event => handleFileChange('adminPhoto', event.target.files?.[0] || null)}
                />
              </label>
              <label className="full">
                Blog images (exactly two)
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={event => handleFileChange('blogImage', Array.from(event.target.files || []))}
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
                    value={form.adminQuotation}
                    onChange={handleInputChange}
                  />
                </label>
                <label>
                  Name
                  <input name="adminName" value={form.adminName} onChange={handleInputChange} />
                </label>
                <label>
                  Designation
                  <input
                    name="adminDesignation"
                    value={form.adminDesignation}
                    onChange={handleInputChange}
                  />
                </label>
              </div>
            </div>

            <div className="faqs">
              <div className="panel-header">
                <h3>FAQs</h3>
                <button type="button" className="ghost" onClick={addFaq}>
                  Add FAQ
                </button>
              </div>
              {faqs.map((faq, index) => (
                <div className="faq-item" key={`faq-${index}`}>
                  <label>
                    Question
                    <input
                      value={faq.question}
                      onChange={event => handleFaqChange(index, 'question', event.target.value)}
                    />
                  </label>
                  <label>
                    Answer
                    <input
                      value={faq.answer}
                      onChange={event => handleFaqChange(index, 'answer', event.target.value)}
                    />
                  </label>
                  {faqs.length > 1 && (
                    <button type="button" className="ghost" onClick={() => removeFaq(index)}>
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
              <button type="button" className="ghost" onClick={resetForm} disabled={loading}>
                Clear
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

export default App
