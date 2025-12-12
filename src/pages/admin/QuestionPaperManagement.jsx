import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Table from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import FileUploader from '../../components/common/FileUploader'
import { Plus, Pencil, Trash2, FileText, Search, Link2, RefreshCw, CheckCircle, XCircle, Clock, Loader2, Eye, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

const QuestionPaperManagement = () => {
  const { userProfile, isAdmin } = useAuth()
  const [papers, setPapers] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPaper, setEditingPaper] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [extractingId, setExtractingId] = useState(null)
  const [viewQuestionsModal, setViewQuestionsModal] = useState(null)
  const [extractionDraft, setExtractionDraft] = useState(null)
  const [savingExtraction, setSavingExtraction] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    class_id: '',
    subject_id: '',
    total_marks: 100,
    exam_date: '',
    instructions: '',
    is_active: true
  })

  const cloneExtraction = (value) => {
    if (!value) return value
    const cloner = typeof globalThis.structuredClone === 'function' ? globalThis.structuredClone : null
    if (cloner) {
      try {
        return cloner(value)
      } catch (error) {
        // fall through to JSON clone
      }
    }
    return JSON.parse(JSON.stringify(value))
  }

  const isNonEmptyText = (value) => {
    if (value === undefined || value === null) return false
    const text = String(value).trim()
    return text.length > 0
  }

  const getPreferredExpectedKey = (question) => {
    if (question?.question_type === 'MCQ' || question?.question_type === 'Multiple Choice') return 'correct_answer'
    if (Array.isArray(question?.options) && question.options.length > 0) return 'correct_answer'
    return 'expected_answer'
  }

  const getExpectedField = (question) => {
    if (!question || typeof question !== 'object') {
      return { key: 'expected_answer', value: '' }
    }

    const candidates = [
      { key: 'correct_answer', value: question.correct_answer },
      { key: 'expected_answer', value: question.expected_answer },
      // Backward/variant keys (in case older extractions used different names)
      { key: 'expected', value: question.expected },
      { key: 'answer', value: question.answer }
    ]

    const found = candidates.find((c) => Object.prototype.hasOwnProperty.call(question, c.key) && isNonEmptyText(c.value))
    if (found) return { key: found.key, value: found.value }

    const fallbackKey = getPreferredExpectedKey(question)
    const fallbackValue = Object.prototype.hasOwnProperty.call(question, fallbackKey) ? question[fallbackKey] : ''
    return { key: fallbackKey, value: fallbackValue ?? '' }
  }

  const extractOptionLetter = (value) => {
    if (!isNonEmptyText(value)) return ''
    const text = String(value).trim()
    const match = text.match(/\b([A-D])\b/i) || text.match(/^\s*([A-D])\s*[).:-]?/i)
    return match?.[1] ? match[1].toUpperCase() : ''
  }

  const canEditExtraction = isAdmin

  useEffect(() => {
    fetchLookups()
    fetchPapers()
  }, [])

  useEffect(() => {
    if (viewQuestionsModal?.extracted_questions) {
      setExtractionDraft(cloneExtraction(viewQuestionsModal.extracted_questions))
    } else {
      setExtractionDraft(null)
    }
    setSavingExtraction(false)
  }, [viewQuestionsModal])

  const fetchLookups = async () => {
    try {
      const [classRes, subjectRes] = await Promise.all([
        supabase.from('classes').select('*').order('name'),
        supabase.from('subjects').select('*').order('name')
      ])

      if (classRes.error) throw classRes.error
      if (subjectRes.error) throw subjectRes.error

      setClasses(classRes.data || [])
      setSubjects(subjectRes.data || [])
    } catch (error) {
      toast.error('Failed to load lookup data')
      console.error(error)
    }
  }

  const fetchPapers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('question_papers')
        .select(`
          *,
          classes (id, name),
          subjects (id, name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPapers(data || [])
    } catch (error) {
      toast.error('Failed to fetch question papers')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      class_id: '',
      subject_id: '',
      total_marks: 100,
      exam_date: '',
      instructions: '',
      is_active: true
    })
    setSelectedFile(null)
    setEditingPaper(null)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const uploadFileToStorage = async (file) => {
    const sanitizedName = file.name.replace(/\s+/g, '-').toLowerCase()
    const filePath = `${Date.now()}-${sanitizedName}`

    const { error: uploadError } = await supabase.storage
      .from('question-papers')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('question-papers')
      .getPublicUrl(filePath)

    return {
      file_url: data.publicUrl,
      file_name: file.name,
      file_size: file.size
    }
  }

  const deleteFileFromStorage = async (fileUrl) => {
    if (!fileUrl) return
    const parts = fileUrl.split('/question-papers/')
    if (parts.length < 2) return
    const path = parts[1]
    await supabase.storage.from('question-papers').remove([path])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.title.trim() || !formData.class_id || !formData.subject_id) {
      toast.error('Title, Class, and Subject are required')
      return
    }

    if (!editingPaper && !selectedFile) {
      toast.error('Please upload the question paper file')
      return
    }

    try {
      setUploading(true)
      let filePayload = {}

      if (selectedFile) {
        filePayload = await uploadFileToStorage(selectedFile)
        if (editingPaper?.file_url && filePayload.file_url !== editingPaper.file_url) {
          await deleteFileFromStorage(editingPaper.file_url)
        }
      }

      const payload = {
        title: formData.title,
        class_id: formData.class_id,
        subject_id: formData.subject_id,
        total_marks: Number(formData.total_marks) || 0,
        exam_date: formData.exam_date || null,
        instructions: formData.instructions || null,
        is_active: formData.is_active,
        uploaded_by: userProfile?.id || null,
        ...filePayload
      }

      if (editingPaper && !selectedFile) {
        payload.file_url = editingPaper.file_url
        payload.file_name = editingPaper.file_name
        payload.file_size = editingPaper.file_size
      }

      if (editingPaper) {
        const { error } = await supabase
          .from('question_papers')
          .update(payload)
          .eq('id', editingPaper.id)

        if (error) throw error
        toast.success('Question paper updated')
        
        // Re-extract questions if file was changed
        if (selectedFile) {
          extractQuestions(editingPaper.id)
        }
      } else {
        const { data, error } = await supabase
          .from('question_papers')
          .insert([payload])
          .select()
          .single()

        if (error) throw error
        toast.success('Question paper created')
        
        // Automatically extract questions after upload
        if (data?.id) {
          extractQuestions(data.id)
        }
      }

      setIsModalOpen(false)
      resetForm()
      fetchPapers()
    } catch (error) {
      toast.error(error.message || 'Operation failed')
      console.error(error)
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (paper) => {
    setEditingPaper(paper)
    setFormData({
      title: paper.title,
      class_id: paper.class_id,
      subject_id: paper.subject_id,
      total_marks: paper.total_marks || 100,
      exam_date: paper.exam_date ? paper.exam_date.split('T')[0] : '',
      instructions: paper.instructions || '',
      is_active: paper.is_active
    })
    setSelectedFile(null)
    setIsModalOpen(true)
  }

  const handleDelete = async (paper) => {
    if (!window.confirm('Delete this question paper?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('question_papers')
        .delete()
        .eq('id', paper.id)

      if (error) throw error
      await deleteFileFromStorage(paper.file_url)
      toast.success('Question paper deleted')
      fetchPapers()
    } catch (error) {
      toast.error('Unable to delete question paper')
      console.error(error)
    }
  }

  const closeViewQuestions = () => {
    setViewQuestionsModal(null)
    setExtractionDraft(null)
    setSavingExtraction(false)
  }

  const handleExpectedChange = (sectionIndex, questionIndex, value) => {
    if (!canEditExtraction) return

    setExtractionDraft((prev) => {
      const source = prev
        ? cloneExtraction(prev)
        : (viewQuestionsModal?.extracted_questions ? cloneExtraction(viewQuestionsModal.extracted_questions) : null)

      if (!source?.sections?.[sectionIndex]?.questions?.[questionIndex]) {
        return source
      }

      const question = source.sections[sectionIndex].questions[questionIndex]
      const targetKey = getExpectedField(question).key
      question[targetKey] = value
      return source
    })
  }

  const handleSaveExtraction = async () => {
    if (!canEditExtraction || !viewQuestionsModal?.id || !extractionDraft) {
      return
    }

    try {
      setSavingExtraction(true)
      const updatedExtraction = cloneExtraction(extractionDraft)
      const { error } = await supabase
        .from('question_papers')
        .update({ extracted_questions: updatedExtraction })
        .eq('id', viewQuestionsModal.id)

      if (error) throw error

      setPapers((prev) =>
        prev.map((paper) =>
          paper.id === viewQuestionsModal.id
            ? { ...paper, extracted_questions: updatedExtraction }
            : paper
        )
      )

      setViewQuestionsModal((prev) =>
        prev ? { ...prev, extracted_questions: updatedExtraction } : prev
      )

      toast.success('Expected answers updated')
    } catch (error) {
      toast.error(error.message || 'Failed to update expected answers')
      console.error(error)
    } finally {
      setSavingExtraction(false)
    }
  }

  // Extract questions from question paper using Edge Function
  const extractQuestions = async (paperId) => {
    setExtractingId(paperId)
    try {
      const { data, error } = await supabase.functions.invoke('extract-questions', {
        body: { question_paper_id: paperId }
      })

      if (error) throw error
      
      if (data?.success) {
        toast.success(`Extracted ${data.questions} questions from ${data.sections} sections`)
        fetchPapers()
      } else {
        throw new Error(data?.error || 'Extraction failed')
      }
    } catch (error) {
      toast.error('Failed to extract questions: ' + error.message)
      console.error(error)
      fetchPapers()
    } finally {
      setExtractingId(null)
    }
  }

  // Get extraction status badge
  const getExtractionBadge = (paper) => {
    const status = paper.extraction_status || 'pending'
    const isExtracting = extractingId === paper.id

    if (isExtracting) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <Loader2 size={12} className="animate-spin" />
          Extracting...
        </span>
      )
    }

    switch (status) {
      case 'completed':
        const questionCount = paper.extracted_questions?.sections?.reduce(
          (sum, s) => sum + (s.questions?.length || 0), 0
        ) || 0
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle size={12} />
            {questionCount} Questions
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Loader2 size={12} className="animate-spin" />
            Processing...
          </span>
        )
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700" title={paper.extraction_error}>
            <XCircle size={12} />
            Error
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <Clock size={12} />
            Pending
          </span>
        )
    }
  }

  const filteredPapers = papers.filter((paper) => {
    const term = searchTerm.toLowerCase()
    const title = paper.title?.toLowerCase() || ''
    const className = paper.classes?.name?.toLowerCase() || ''
    const subjectName = paper.subjects?.name?.toLowerCase() || ''
    return title.includes(term) || className.includes(term) || subjectName.includes(term)
  })

  const extractionData = extractionDraft || viewQuestionsModal?.extracted_questions || null

  const columns = [
    {
      header: 'Question Paper',
      accessor: 'title',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-800">{row.title}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <FileText size={14} />
            <span>{row.file_name}</span>
            {row.file_size && <span>{(row.file_size / (1024 * 1024)).toFixed(2)} MB</span>}
          </div>
        </div>
      )
    },
    {
      header: 'Class',
      accessor: 'class',
      render: (row) => <span className="text-gray-700">{row.classes?.name || '-'}</span>
    },
    {
      header: 'Subject',
      accessor: 'subject',
      render: (row) => <span className="text-gray-700">{row.subjects?.name || '-'}</span>
    },
    {
      header: 'Total Marks',
      accessor: 'total_marks',
      render: (row) => <span className="font-medium text-gray-800">{row.total_marks || 0}</span>
    },
    {
      header: 'Questions',
      accessor: 'extraction_status',
      render: (row) => getExtractionBadge(row)
    },
    {
      header: 'Status',
      accessor: 'is_active',
      render: (row) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
          }`}
        >
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Question Papers</h1>
          <p className="text-gray-500">Manage uploaded exams and AI prompts</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Upload Paper
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search papers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <Table
        columns={columns}
        data={filteredPapers}
        loading={loading}
        emptyMessage="No question papers uploaded"
        actions={(row) => (
          <div className="flex items-center gap-1">
            {row.file_url && (
              <a
                href={row.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="View file"
              >
                <Link2 size={16} />
              </a>
            )}
            {row.extraction_status === 'completed' && row.extracted_questions && (
              <button
                onClick={() => setViewQuestionsModal(row)}
                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="View extracted questions"
              >
                <Eye size={16} />
              </button>
            )}
            <button
              onClick={() => extractQuestions(row.id)}
              disabled={extractingId === row.id}
              className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
              title={row.extraction_status === 'completed' ? 'Re-extract questions' : 'Extract questions'}
            >
              <RefreshCw size={16} className={extractingId === row.id ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => handleEdit(row)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => handleDelete(row)}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPaper ? 'Edit Question Paper' : 'Upload Question Paper'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Mid Term Science Paper"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
              <select
                value={formData.class_id}
                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select class</option>
                {classes.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <select
                value={formData.subject_id}
                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
              <input
                type="number"
                value={formData.total_marks}
                onChange={(e) => setFormData({ ...formData, total_marks: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exam Date</label>
              <input
                type="date"
                value={formData.exam_date}
                onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <FileUploader
            label={editingPaper ? 'Replace File (optional)' : 'Question Paper File *'}
            onFileSelect={setSelectedFile}
            accept=".pdf,.png,.jpg,.jpeg"
            maxSize={25}
          />
          {editingPaper && !selectedFile && (
            <p className="text-xs text-gray-500">Current file: {editingPaper.file_name}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instructions / AI Prompt Notes</label>
            <textarea
              rows={4}
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any special evaluation instructions"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
            />
            Active
          </label>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={uploading}
            >
              {uploading ? 'Saving...' : editingPaper ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Questions Modal */}
      <Modal
        isOpen={!!viewQuestionsModal}
        onClose={closeViewQuestions}
        title={`Extracted Questions - ${extractionData?.title || viewQuestionsModal?.title || ''}`}
        size="xl"
      >
        {extractionData ? (
          <>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800">
                  {extractionData.title || viewQuestionsModal?.title}
                </h3>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-blue-600">
                  <span>Total Marks: {extractionData.total_marks ?? viewQuestionsModal?.total_marks}</span>
                  {extractionData.duration && <span>Duration: {extractionData.duration}</span>}
                </div>
                {Array.isArray(extractionData.instructions) && extractionData.instructions.length > 0 && (
                  <div className="mt-2 text-sm text-blue-700">
                    <strong>Instructions:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {extractionData.instructions.map((inst, i) => (
                        <li key={i}>{inst}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {extractionData.sections?.map((section, sIdx) => (
                <div key={sIdx} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-3 border-b">
                    <h4 className="font-semibold text-gray-800">
                      Section {section.section}: {section.section_name || ''}
                    </h4>
                    <div className="flex gap-4 text-sm text-gray-600 mt-1">
                      <span>Marks: {section.total_marks}</span>
                      {section.attempt_required && (
                        <span>Attempt: {section.attempt_required} questions</span>
                      )}
                    </div>
                    {section.instructions && (
                      <p className="text-sm text-gray-500 mt-1 italic">{section.instructions}</p>
                    )}
                  </div>
                  <div className="divide-y">
                    {section.questions?.map((q, qIdx) => {
                      const expectedField = getExpectedField(q)
                      const expectedKey = expectedField.key
                      const expectedValue = expectedField.value ?? ''
                      const optionKey = extractOptionLetter(expectedValue)

                      return (
                        <div key={qIdx} className="p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-700">Q{q.question_number}.</span>
                                <span className="px-2 py-0.5 bg-gray-200 rounded text-xs text-gray-600">
                                  {q.question_type || 'Question'}
                                </span>
                                <span className="text-xs text-gray-500">[{q.marks} marks]</span>
                              </div>
                              <p className="text-gray-800 whitespace-pre-wrap">{q.question_text}</p>

                              {Array.isArray(q.options) && q.options.length > 0 && (
                                <div className="mt-2 ml-4 space-y-1">
                                  {q.options.map((opt, oIdx) => {
                                    const normalizedOption = opt != null ? opt.toString().trim().toUpperCase() : ''
                                    const isCorrectOption = !!optionKey && (
                                      normalizedOption.startsWith(optionKey) ||
                                      normalizedOption.startsWith(`${optionKey})`) ||
                                      normalizedOption.startsWith(`${optionKey}.`) ||
                                      normalizedOption.startsWith(`${optionKey} `)
                                    )
                                    return (
                                      <p
                                        key={oIdx}
                                        className={`text-sm ${isCorrectOption ? 'text-green-600 font-medium' : 'text-gray-600'}`}
                                      >
                                        {opt}
                                      </p>
                                    )
                                  })}
                                </div>
                              )}

                              {canEditExtraction ? (
                                <div className="mt-3">
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Expected Answer
                                  </label>
                                  <textarea
                                    value={expectedValue}
                                    onChange={(e) => handleExpectedChange(sIdx, qIdx, e.target.value)}
                                    rows={Math.min(6, Math.max(2, Math.ceil((expectedValue || '').length / 80)))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="Enter expected answer"
                                  />
                                </div>
                              ) : (
                                expectedValue && (
                                  <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                                    <span className="font-medium text-green-700">Expected: </span>
                                    <span className="text-green-800">{expectedValue}</span>
                                  </div>
                                )
                              )}

                              {q.or_question && (
                                <div className="mt-3 p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                                  <p className="text-xs font-medium text-yellow-700 mb-1">OR</p>
                                  <p className="text-gray-800">{q.or_question.question_text}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {Array.isArray(extractionData.extraction_notes) && extractionData.extraction_notes.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">Extraction Notes</h4>
                  <ul className="list-disc list-inside text-sm text-yellow-700">
                    {extractionData.extraction_notes.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {canEditExtraction && extractionDraft && (
              <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleSaveExtraction}
                  disabled={savingExtraction}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  {savingExtraction ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">No extracted questions available.</p>
        )}
      </Modal>
    </div>
  )
}

export default QuestionPaperManagement
