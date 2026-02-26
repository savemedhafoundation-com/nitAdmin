import { useEffect, useMemo, useState } from 'react'
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
  { key: 'title', label: 'Title', schemaPath: 'title', required: true, comment: 'Main heading shown in case study details. use image1, image2, etc.' },
  { key: 'abstract', label: 'Abstract', schemaPath: 'abstract', comment: 'Short summary of the full case study. use image1, image2, etc.' },
  { key: 'introduction', label: 'Introduction', schemaPath: 'introduction', comment: 'Context, objective and background of the study.' },
  { key: 'keywords', label: 'Keywords', schemaPath: 'keywords', comment: 'Add searchable terms related to this case study.' },
  { key: 'reviewOfLiterature', label: 'Review of Literature', schemaPath: 'reviewOfLiterature', comment: 'Reference prior work and findings.' },
  { key: 'researchGap', label: 'Research Gap', schemaPath: 'researchGap', comment: 'Describe what previous work has not addressed.' },
  { key: 'researchObjectives', label: 'Research Objectives', schemaPath: 'researchObjectives', comment: 'List the measurable objectives of the study.' },
  { key: 'researchQuestions', label: 'Research Questions', schemaPath: 'researchQuestions', comment: 'Add the key questions explored in this case.' },
  { key: 'researchHypothesis', label: 'Research Hypothesis', schemaPath: 'researchHypothesis', comment: 'State the hypothesis being tested.' },
  { key: 'caseDescription', label: 'Case Description', schemaPath: 'caseDescription', comment: 'Describe patient/case profile and condition.' },
  { key: 'methodologyContent', label: 'Methodology', schemaPath: 'methodology.content', comment: 'Explain methods, process, and protocol.' },
  { key: 'observationContent', label: 'Observation', schemaPath: 'observation.content', comment: 'Capture observations recorded during the study.' },
  { key: 'dataAnalysisContent', label: 'Data Analysis', schemaPath: 'dataAnalysis.content', comment: 'Interpret trends, patterns, and findings.' },
  { key: 'resultContent', label: 'Result', schemaPath: 'result.content', comment: 'You can type image1, image2, etc. to show uploaded result images inline.' },
  { key: 'ethicalConsideration', label: 'Ethical Consideration', schemaPath: 'ethicalConsideration', comment: 'Document ethical safeguards and compliance.' },
  { key: 'discussion', label: 'Discussion', schemaPath: 'discussion', comment: 'Discuss implications and meaning of the findings.' },
  { key: 'expectedOutcomes', label: 'Expected Outcomes', schemaPath: 'expectedOutcomes', comment: 'State expected impact and practical outcomes.' },
  { key: 'scientificSignificance', label: 'Scientific Significance', schemaPath: 'scientificSignificance', comment: 'Explain scientific novelty and contribution.' },
  { key: 'limitation', label: 'Limitation', schemaPath: 'limitation', comment: 'Mention study boundaries and known constraints.' },
  { key: 'placeOfResearch', label: 'Place of Research', schemaPath: 'placeOfResearch', comment: 'Specify where the research/case was conducted.' },
  { key: 'conclusion', label: 'Conclusion', schemaPath: 'conclusion', comment: 'Final summary and overall takeaway.' },
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

const escapeHtml = value => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const tablesToHtml = tables => {
  if (!Array.isArray(tables) || tables.length === 0) return ''

  return tables
    .map(table => {
      const headers = Array.isArray(table.headers) ? table.headers : []
      const rows = Array.isArray(table.rows) ? table.rows : []
      const title = table.title ? `<p><strong>${escapeHtml(table.title)}</strong></p>` : ''

      const headerHtml =
        headers.length > 0
          ? `<tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr>`
          : ''

      const rowsHtml = rows
        .map(row => {
          const cells = Array.isArray(row) ? row : []
          return `<tr>${cells.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
        })
        .join('')

      return `${title}<table><tbody>${headerHtml}${rowsHtml}</tbody></table>`
    })
    .join('<p><br/></p>')
}

const graphsToTables = graphs => {
  if (!Array.isArray(graphs)) return []

  return graphs
    .map(graph => {
      const datasets = Array.isArray(graph.datasets) ? graph.datasets : []
      const labels = Array.isArray(graph.labels) ? graph.labels : []
      if (datasets.length === 0) return null

      const headers = ['Label', ...datasets.map(dataset => dataset.label || 'Series')]
      const maxRows = Math.max(labels.length, ...datasets.map(dataset => dataset.data?.length || 0))

      const rows = Array.from({ length: maxRows }, (_, rowIndex) => {
        const row = [labels[rowIndex] ?? '']
        datasets.forEach(dataset => {
          row.push(dataset?.data?.[rowIndex] ?? '')
        })
        return row
      })

      return {
        title: graph.title || '',
        headers,
        rows,
      }
    })
    .filter(Boolean)
}

const imagesToTables = images => {
  if (!Array.isArray(images) || images.length === 0) return []

  return [
    {
      title: 'Result Images Metadata',
      headers: ['url', 'publicId', 'caption', 'altText'],
      rows: images.map(image => [
        image?.url || '',
        image?.publicId || '',
        image?.caption || '',
        image?.altText || '',
      ]),
    },
  ]
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

const buildEditorStateFromCaseStudy = caseStudy => ({
  title: caseStudy?.title || '',
  abstract: caseStudy?.abstract || '',
  introduction: caseStudy?.introduction || '',
  keywords: caseStudy?.keywords || '',
  reviewOfLiterature: caseStudy?.reviewOfLiterature || '',
  researchGap: caseStudy?.researchGap || '',
  researchObjectives: caseStudy?.researchObjectives || '',
  researchQuestions: caseStudy?.researchQuestions || '',
  researchHypothesis: caseStudy?.researchHypothesis || '',
  caseDescription: caseStudy?.caseDescription || '',
  methodologyContent: caseStudy?.methodology?.content || '',
  observationContent: caseStudy?.observation?.content || '',
  dataAnalysisContent: caseStudy?.dataAnalysis?.content || '',
  resultContent: caseStudy?.result?.content || '',
  ethicalConsideration: caseStudy?.ethicalConsideration || '',
  discussion: caseStudy?.discussion || '',
  expectedOutcomes: caseStudy?.expectedOutcomes || '',
  scientificSignificance: caseStudy?.scientificSignificance || '',
  limitation: caseStudy?.limitation || '',
  placeOfResearch: caseStudy?.placeOfResearch || '',
  conclusion: caseStudy?.conclusion || '',
})

const buildStructuredStateFromCaseStudy = caseStudy => ({
  methodologyTables: tablesToHtml(caseStudy?.methodology?.tables || []),
  observationTables: tablesToHtml(caseStudy?.observation?.tables || []),
  dataAnalysisTables: tablesToHtml(caseStudy?.dataAnalysis?.tables || []),
  dataAnalysisGraphs: tablesToHtml(graphsToTables(caseStudy?.dataAnalysis?.graphs || [])),
  resultTables: tablesToHtml(caseStudy?.result?.tables || []),
  resultImagesData: tablesToHtml(imagesToTables(caseStudy?.result?.images || [])),
})

const CaseStudyFormPanel = ({
  api,
  mode = 'create',
  initialData = null,
  onSuccess,
  onCancel,
}) => {
  const [editorData, setEditorData] = useState(initialEditorState)
  const [structuredData, setStructuredData] = useState(initialStructuredState)
  const [resultImages, setResultImages] = useState([])
  const [publishStatus, setPublishStatus] = useState('draft')
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isSaving, setIsSaving] = useState(false)

  const isEditMode = mode === 'edit' && Boolean(initialData?._id)
  const requiredFields = useMemo(() => editorFields.filter(field => field.required), [])

  useEffect(() => {
    if (isEditMode) {
      setEditorData(buildEditorStateFromCaseStudy(initialData))
      setStructuredData(buildStructuredStateFromCaseStudy(initialData))
      setPublishStatus(initialData?.status || 'draft')
      setResultImages([])
      setStatus({ type: '', message: '' })
      return
    }

    setEditorData(initialEditorState)
    setStructuredData(initialStructuredState)
    setPublishStatus('draft')
    setResultImages([])
    setStatus({ type: '', message: '' })
  }, [isEditMode, initialData])

  const handleEditorChange = (key, value) => {
    setEditorData(prev => ({ ...prev, [key]: value }))
  }

  const handleStructuredEditorChange = (key, value) => {
    setStructuredData(prev => ({ ...prev, [key]: value }))
  }

  const handleResultImagesChange = event => {
    const newFiles = Array.from(event.target.files || [])
    if (newFiles.length === 0) return

    setResultImages(prev => {
      const existingKeys = new Set(prev.map(file => `${file.name}-${file.size}-${file.lastModified}`))
      const uniqueNewFiles = newFiles.filter(
        file => !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`)
      )
      return [...prev, ...uniqueNewFiles]
    })

    event.target.value = ''
  }

  const resetForm = () => {
    if (isEditMode) {
      setEditorData(buildEditorStateFromCaseStudy(initialData))
      setStructuredData(buildStructuredStateFromCaseStudy(initialData))
      setPublishStatus(initialData?.status || 'draft')
      setResultImages([])
      setStatus({ type: '', message: '' })
      return
    }

    setEditorData(initialEditorState)
    setStructuredData(initialStructuredState)
    setResultImages([])
    setPublishStatus('draft')
    setStatus({ type: '', message: '' })
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

      const response = isEditMode
        ? await api.put(`/case-studies/${initialData._id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        : await api.post('/case-studies', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })

      setStatus({
        type: 'success',
        message: isEditMode ? 'Case study updated successfully.' : 'Case study created successfully.',
      })

      onSuccess?.(response.data)

      if (!isEditMode) {
        setEditorData(initialEditorState)
        setStructuredData(initialStructuredState)
        setResultImages([])
        setPublishStatus('draft')
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.response?.data?.message || error.message || 'Unable to save case study.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="panel case-study-panel">
      <div className="panel-header">
        <h2>{isEditMode ? 'Edit Case Study' : 'Case Study Form'}</h2>
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
            <div key={field.key} className={`field-block ${field.key === 'title' ? 'full' : ''}`}>
              <span className="field-title">{field.label}</span>
              <span className="field-schema">{field.schemaPath}</span>
              {field.comment && <span className="field-comment">{field.comment}</span>}
              <ReactQuill
                theme="snow"
                value={editorData[field.key]}
                onChange={value => handleEditorChange(field.key, value)}
                title={`${field.label} (${field.schemaPath})`}
                modules={quillModules}
                formats={quillFormats}
              />
            </div>
          ))}
        </div>

        <div className="case-study-json-grid">
          {structuredArrayFields.map(field => (
            <div key={field.key} className="field-block structured-field">
              <span className="field-title">{field.label}</span>
              <span className="field-note">{field.note}</span>
              <ReactQuill
                theme="snow"
                value={structuredData[field.key]}
                onChange={value => handleStructuredEditorChange(field.key, value)}
                title={`${field.label} (${field.schemaPath})`}
                modules={quillTableOnlyModules}
                formats={quillTableOnlyFormats}
              />
            </div>
          ))}

          <label>
            Result Images
            <span className="field-schema">result images (upload files)</span>
            <input
              type="file"
              title="Result Images Upload (result.images)"
              accept="image/*"
              multiple
              onChange={handleResultImagesChange}
            />
            <span className="field-note">Selected images: {resultImages.length}</span>
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
            {isSaving ? 'Saving...' : isEditMode ? 'Update case study' : 'Create case study'}
          </button>
          <button type="button" className="ghost" onClick={resetForm} disabled={isSaving}>
            Clear
          </button>
          {typeof onCancel === 'function' && (
            <button type="button" className="ghost" onClick={onCancel} disabled={isSaving}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default CaseStudyFormPanel
