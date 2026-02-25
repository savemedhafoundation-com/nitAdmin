import { useMemo, useState } from 'react'
import ReactQuill from 'react-quill-new'
import {
  quillFormats,
  quillModules,
  quillTableOnlyFormats,
  quillTableOnlyModules,
} from '../utils/quillConfig'

const isEmptyHtml = value => {
  if (!value) return true
  const stripped = String(value).replace(/<(.|\n)*?>/g, '').trim()
  return stripped.length === 0
}

const editorFields = [
  { key: 'title', label: 'Title', schemaPath: 'title', required: true },
  { key: 'abstract', label: 'Abstract', schemaPath: 'abstract' },
  { key: 'introduction', label: 'Introduction', schemaPath: 'introduction' },
  { key: 'keywords', label: 'Keywords', schemaPath: 'keywords' },
  { key: 'reviewOfLiterature', label: 'Review of Literature', schemaPath: 'reviewOfLiterature' },
  { key: 'researchGap', label: 'Research Gap', schemaPath: 'researchGap' },
  { key: 'researchObjectives', label: 'Research Objectives', schemaPath: 'researchObjectives' },
  { key: 'researchQuestions', label: 'Research Questions', schemaPath: 'researchQuestions' },
  { key: 'researchHypothesis', label: 'Research Hypothesis', schemaPath: 'researchHypothesis' },
  { key: 'caseDescription', label: 'Case Description', schemaPath: 'caseDescription' },
  { key: 'methodologyContent', label: 'Methodology', schemaPath: 'methodology.content' },
  { key: 'observationContent', label: 'Observation', schemaPath: 'observation.content' },
  { key: 'dataAnalysisContent', label: 'Data Analysis', schemaPath: 'dataAnalysis.content' },
  { key: 'resultContent', label: 'Result', schemaPath: 'result.content' },
  { key: 'ethicalConsideration', label: 'Ethical Consideration', schemaPath: 'ethicalConsideration' },
  { key: 'discussion', label: 'Discussion', schemaPath: 'discussion' },
  { key: 'expectedOutcomes', label: 'Expected Outcomes', schemaPath: 'expectedOutcomes' },
  { key: 'scientificSignificance', label: 'Scientific Significance', schemaPath: 'scientificSignificance' },
  { key: 'limitation', label: 'Limitation', schemaPath: 'limitation' },
  { key: 'placeOfResearch', label: 'Place of Research', schemaPath: 'placeOfResearch' },
  { key: 'conclusion', label: 'Conclusion', schemaPath: 'conclusion' },
]

const structuredArrayFields = [
  {
    key: 'methodologyTables',
    label: 'Methodology Tables',
    schemaPath: 'methodology.tables',
    kind: 'tables',
    note: 'Insert one or more tables. First row is treated as table headers.',
  },
  {
    key: 'observationTables',
    label: 'Observation Tables',
    schemaPath: 'observation.tables',
    kind: 'tables',
    note: 'Insert one or more tables. First row is treated as table headers.',
  },
  {
    key: 'dataAnalysisTables',
    label: 'Data Analysis Tables',
    schemaPath: 'dataAnalysis.tables',
    kind: 'tables',
    note: 'Insert one or more tables. First row is treated as table headers.',
  },
  {
    key: 'dataAnalysisGraphs',
    label: 'Data Analysis Graphs',
    schemaPath: 'dataAnalysis.graphs',
    kind: 'graphs',
    note: 'Graph table format: first column = labels, remaining columns = dataset series.',
  },
  {
    key: 'resultTables',
    label: 'Result Tables',
    schemaPath: 'result.tables',
    kind: 'tables',
    note: 'Insert one or more tables. First row is treated as table headers.',
  },
  {
    key: 'resultImagesData',
    label: 'Result Images Metadata',
    schemaPath: 'result.images',
    kind: 'images',
    note: 'Metadata table columns: url | publicId | caption | altText',
  },
]

const initialEditorState = editorFields.reduce((acc, field) => {
  acc[field.key] = ''
  return acc
}, {})

const initialStructuredState = structuredArrayFields.reduce((acc, field) => {
  acc[field.key] = ''
  return acc
}, {})

const getCellText = cell => String(cell?.textContent || '').replace(/\u00a0/g, ' ').trim()

const normalizeHeaderKey = value => String(value || '').trim().toLowerCase().replace(/\s+/g, '')

const toNumericIfPossible = value => {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return ''
  const numberValue = Number(trimmed)
  return Number.isFinite(numberValue) ? numberValue : trimmed
}

const extractTablesFromHtml = html => {
  if (isEmptyHtml(html)) return []

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const tableElements = Array.from(doc.querySelectorAll('table'))

  return tableElements
    .map(table => {
      const rows = Array.from(table.querySelectorAll('tr'))
        .map(row => Array.from(row.querySelectorAll('th, td')).map(getCellText))
        .filter(row => row.some(Boolean))

      if (rows.length === 0) return null

      const [headers, ...dataRows] = rows
      return {
        title: '',
        headers,
        rows: dataRows,
      }
    })
    .filter(Boolean)
}

const mapTablesToGraphs = tables => {
  return tables
    .map((table, index) => {
      const headers = Array.isArray(table.headers) ? table.headers : []
      const rows = Array.isArray(table.rows) ? table.rows : []
      if (headers.length < 2 || rows.length === 0) return null

      const labels = rows.map(row => String(row?.[0] ?? '').trim()).filter(Boolean)
      if (labels.length === 0) return null

      const datasets = headers
        .slice(1)
        .map((datasetHeader, datasetIndex) => {
          const data = rows
            .map(row => toNumericIfPossible(row?.[datasetIndex + 1]))
            .filter(value => value !== '')

          if (data.length === 0) return null

          return {
            label: String(datasetHeader || `Series ${datasetIndex + 1}`).trim(),
            data,
          }
        })
        .filter(Boolean)

      if (datasets.length === 0) return null

      return {
        title: table.title || `Graph ${index + 1}`,
        type: 'bar',
        labels,
        datasets,
        config: {},
      }
    })
    .filter(Boolean)
}

const mapTablesToImageMetadata = tables => {
  return tables.flatMap(table => {
    const headers = Array.isArray(table.headers) ? table.headers.map(normalizeHeaderKey) : []
    const rows = Array.isArray(table.rows) ? table.rows : []

    const urlIndex = headers.indexOf('url')
    if (urlIndex === -1) return []

    const publicIdIndex = headers.indexOf('publicid')
    const captionIndex = headers.indexOf('caption')
    const altTextIndex = headers.indexOf('alttext')

    return rows
      .map(row => ({
        url: String(row?.[urlIndex] ?? '').trim(),
        publicId: publicIdIndex >= 0 ? String(row?.[publicIdIndex] ?? '').trim() : '',
        caption: captionIndex >= 0 ? String(row?.[captionIndex] ?? '').trim() : '',
        altText: altTextIndex >= 0 ? String(row?.[altTextIndex] ?? '').trim() : '',
      }))
      .filter(item => item.url)
  })
}

const CaseStudyFormPanel = ({ api }) => {
  const [editorData, setEditorData] = useState(initialEditorState)
  const [structuredData, setStructuredData] = useState(initialStructuredState)
  const [resultImages, setResultImages] = useState([])
  const [publishStatus, setPublishStatus] = useState('draft')
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isSaving, setIsSaving] = useState(false)

  const requiredFields = useMemo(() => editorFields.filter(field => field.required), [])

  const handleEditorChange = (key, value) => {
    setEditorData(prev => ({ ...prev, [key]: value }))
  }

  const handleStructuredEditorChange = (key, value) => {
    setStructuredData(prev => ({ ...prev, [key]: value }))
  }

  const resetForm = () => {
    setEditorData(initialEditorState)
    setStructuredData(initialStructuredState)
    setResultImages([])
    setPublishStatus('draft')
  }

  const handleSubmit = async event => {
    event.preventDefault()
    setStatus({ type: '', message: '' })

    const emptyRequired = requiredFields.find(field => isEmptyHtml(editorData[field.key]))
    if (emptyRequired) {
      setStatus({ type: 'error', message: `${emptyRequired.label} is required.` })
      return
    }

    try {
      setIsSaving(true)
      const formData = new FormData()

      Object.entries(editorData).forEach(([key, value]) => {
        formData.append(key, value || '')
      })
      formData.append('status', publishStatus)

      structuredArrayFields.forEach(field => {
        const tables = extractTablesFromHtml(structuredData[field.key])
        if (tables.length === 0) return

        if (field.kind === 'tables') {
          formData.append(field.key, JSON.stringify(tables))
          return
        }

        if (field.kind === 'graphs') {
          const graphPayload = mapTablesToGraphs(tables)
          if (graphPayload.length > 0) {
            formData.append(field.key, JSON.stringify(graphPayload))
          }
          return
        }

        if (field.kind === 'images') {
          const imagePayload = mapTablesToImageMetadata(tables)
          if (imagePayload.length > 0) {
            formData.append(field.key, JSON.stringify(imagePayload))
          }
        }
      })

      resultImages.forEach(file => formData.append('resultImages', file))

      await api.post('/case-studies', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setStatus({ type: 'success', message: 'Case study created successfully.' })
      resetForm()
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.response?.data?.message || error.message || 'Unable to create case study.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="panel case-study-panel">
      <div className="panel-header">
        <h2>Case Study Form</h2>
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

        <div className="case-study-grid">
          {editorFields.map(field => (
            <label key={field.key} className={field.key === 'title' ? 'full' : ''}>
              {field.label}
              <span className="field-schema">{field.schemaPath}</span>
              <ReactQuill
                theme="snow"
                value={editorData[field.key]}
                onChange={value => handleEditorChange(field.key, value)}
                title={`${field.label} (${field.schemaPath})`}
                modules={quillModules}
                formats={quillFormats}
              />
            </label>
          ))}
        </div>

        <div className="case-study-json-grid">
          {structuredArrayFields.map(field => (
            <label key={field.key}>
              {field.label}
              <span className="field-schema">{field.schemaPath}</span>
              <span className="field-note">{field.note}</span>
              <ReactQuill
                theme="snow"
                value={structuredData[field.key]}
                onChange={value => handleStructuredEditorChange(field.key, value)}
                title={`${field.label} (${field.schemaPath})`}
                modules={quillTableOnlyModules}
                formats={quillTableOnlyFormats}
              />
            </label>
          ))}

          <label>
            Result Images
            <span className="field-schema">result.images (upload files)</span>
            <input
              type="file"
              title="Result Images Upload (result.images)"
              accept="image/*"
              multiple
              onChange={event => setResultImages(Array.from(event.target.files || []))}
            />
          </label>

          <label>
            Publish Status
            <span className="field-schema">status</span>
            <select
              title="Publish Status (status)"
              value={publishStatus}
              onChange={event => setPublishStatus(event.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
        </div>

        {status.message && <p className={`status ${status.type}`}>{status.message}</p>}

        <div className="form-actions">
          <button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Create case study'}
          </button>
          <button type="button" className="ghost" onClick={resetForm} disabled={isSaving}>
            Clear
          </button>
        </div>
      </form>
    </div>
  )
}

export default CaseStudyFormPanel
