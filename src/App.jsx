import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import 'react-quill/dist/quill.snow.css'
import './App.css'
import BlogEditorPanel from './components/BlogEditorPanel'
import BlogHeader from './components/BlogHeader'
import BlogLibraryPanel from './components/BlogLibraryPanel'

// const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://nitbackend.vercel.app/api'
const api = axios.create({ baseURL: API_BASE })

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
  const [currentPage, setCurrentPage] = useState(1)

  const totalBlogs = useMemo(() => blogs.length, [blogs])
  const pageSize = 3
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(blogs.length / pageSize)),
    [blogs.length]
  )
  const pagedBlogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return blogs.slice(start, start + pageSize)
  }, [blogs, currentPage])
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

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

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
    setCurrentPage(1)
    loadBlogs(searchQuery.trim())
  }

  const updateBlogCounts = (blogId, updates) => {
    setBlogs(prev =>
      prev.map(blog => (blog._id === blogId ? { ...blog, ...updates } : blog))
    )
  }

  const handleLike = async blogId => {
    try {
      const { data: payload } = await api.post(`/blogs/${blogId}/like`)
      updateBlogCounts(blogId, { likesCount: payload.likesCount })
    } catch (error) {
      setStatus({ type: 'error', message: 'Unable to update likes right now.' })
    }
  }

  const handleShare = async blogId => {
    try {
      const { data: payload } = await api.post(`/blogs/${blogId}/share`)
      updateBlogCounts(blogId, { sharesCount: payload.sharesCount })
    } catch (error) {
      setStatus({ type: 'error', message: 'Unable to update shares right now.' })
    }
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
      <BlogHeader totalBlogs={totalBlogs} isEditing={Boolean(selectedId)} />

      <section className="dashboard">
        <BlogLibraryPanel
          loading={loading}
          blogs={pagedBlogs}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearch={handleSearch}
          onSelectBlog={selectBlog}
          onDeleteBlog={handleDelete}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onLikeBlog={handleLike}
          onShareBlog={handleShare}
        />
        <BlogEditorPanel
          selectedId={selectedId}
          onReset={resetForm}
          onSubmit={handleSubmit}
          isSaving={isSaving}
          form={form}
          onInputChange={handleInputChange}
          onSpotlightChange={event =>
            setForm(prev => ({ ...prev, spotlight: event.target.checked }))
          }
          onDescriptionChange={value => setForm(prev => ({ ...prev, description: value }))}
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          subcategories={subcategories}
          selectedSubcategoryId={selectedSubcategoryId}
          onCategorySelect={handleCategorySelect}
          onSubcategorySelect={handleSubcategorySelect}
          newCategoryName={newCategoryName}
          onNewCategoryNameChange={setNewCategoryName}
          onAddCategory={handleAddCategory}
          newSubcategoryName={newSubcategoryName}
          onNewSubcategoryNameChange={setNewSubcategoryName}
          onAddSubcategory={handleAddSubcategory}
          onFileChange={handleFileChange}
          faqs={faqs}
          onFaqChange={handleFaqChange}
          onAddFaq={addFaq}
          onRemoveFaq={removeFaq}
          status={status}
          loading={loading}
        />
      </section>
    </div>
  )
}

export default App
