import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Upload, Files, X, Play, Square, Trash2, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, idx)
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`
}

const generateFileHash = async (file) => {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

const checkDuplicate = async (fileHash) => {
  const { data, error } = await supabase.from('answer_sheets').select('id').eq('file_hash', fileHash).maybeSingle()
  if (error) throw error
  return !!data
}

const uploadFileToStorage = async (file) => {
  const sanitizedName = file.name.replace(/\s+/g, '-').toLowerCase()
  const unique = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).replace(/[^a-zA-Z0-9-]/g, '')
  const filePath = `${Date.now()}-${unique}-${sanitizedName}`

  const { error: uploadError } = await supabase.storage
    .from('answer-sheets')
    .upload(filePath, file, { cacheControl: '3600', upsert: false })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('answer-sheets').getPublicUrl(filePath)

  return {
    file_url: data.publicUrl,
    file_name: file.name,
    file_path: filePath
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const isRetryableGradingError = (message) => {
  const text = (message || '').toLowerCase()
  return (
    text.includes('quota') ||
    text.includes('rate') ||
    text.includes('overloaded') ||
    text.includes('resource_exhausted') ||
    text.includes('temporarily') ||
    text.includes('timeout')
  )
}

const BulkUploadAnswerSheets = () => {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [questionPapers, setQuestionPapers] = useState([])
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    class_id: '',
    subject_id: '',
    question_paper_id: ''
  })

  const [queue, setQueue] = useState([])
  const [running, setRunning] = useState(false)
  const stopRef = useRef(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (user) fetchAssignments()
  }, [user])

  useEffect(() => {
    if (formData.class_id && formData.subject_id) {
      fetchQuestionPapers(formData.class_id, formData.subject_id)
    } else {
      setQuestionPapers([])
      setFormData((prev) => ({ ...prev, question_paper_id: '' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.class_id, formData.subject_id])

  const fetchAssignments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_assignments')
        .select(`*, classes (id, name), subjects (id, name)`)
        .eq('user_id', user.id)
        .eq('can_upload', true)

      if (error) throw error
      setAssignments(data || [])
    } catch (error) {
      toast.error('Failed to load assignments')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchQuestionPapers = async (classId, subjectId) => {
    try {
      const { data, error } = await supabase
        .from('question_papers')
        .select('*')
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setQuestionPapers(data || [])
    } catch (error) {
      console.error('Error fetching question papers:', error)
    }
  }

  const uniqueClasses = useMemo(
    () =>
      [...
        new Map(assignments.map((a) => [a.class_id, { id: a.class_id, name: a.classes?.name }])).values()
      ],
    [assignments]
  )

  const availableSubjects = useMemo(
    () => assignments.filter((a) => a.class_id === formData.class_id).map((a) => ({ id: a.subject_id, name: a.subjects?.name })),
    [assignments, formData.class_id]
  )

  const addFilesToQueue = (files) => {
    const accepted = Array.from(files || []).filter((f) => {
      const name = (f.name || '').toLowerCase()
      return name.endsWith('.pdf') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg')
    })

    if (accepted.length === 0) {
      toast.error('Please select PDF/JPG/PNG files')
      return
    }

    setQueue((prev) => {
      const existingKeys = new Set(prev.map((q) => `${q.file.name}-${q.file.size}-${q.file.lastModified}`))
      const next = [...prev]
      for (const file of accepted) {
        const key = `${file.name}-${file.size}-${file.lastModified}`
        if (existingKeys.has(key)) continue
        next.push({
          id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
          file,
          status: 'queued',
          message: '',
          answerSheetId: null
        })
      }
      return next
    })
  }

  const onDrop = (e) => {
    e.preventDefault()
    if (running) return
    addFilesToQueue(e.dataTransfer.files)
  }

  const removeItem = (id) => {
    if (running) return
    setQueue((prev) => prev.filter((q) => q.id !== id))
  }

  const clearQueue = () => {
    if (running) return
    setQueue([])
  }

  const stopQueue = () => {
    stopRef.current = true
    setRunning(false)
  }

  const updateItem = (id, patch) => {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  const runQueue = async () => {
    if (running) return

    if (!formData.class_id || !formData.subject_id || !formData.question_paper_id) {
      toast.error('Please select class, subject and question paper')
      return
    }

    if (queue.length === 0) {
      toast.error('Please add files to upload')
      return
    }

    stopRef.current = false
    setRunning(true)

    for (const item of queue) {
      if (stopRef.current) break
      if (item.status !== 'queued') continue

      try {
        updateItem(item.id, { status: 'hashing', message: 'Checking duplicates...' })
        const fileHash = await generateFileHash(item.file)

        const isDuplicate = await checkDuplicate(fileHash)
        if (isDuplicate) {
          updateItem(item.id, { status: 'duplicate', message: 'Duplicate file (already uploaded)' })
          continue
        }

        updateItem(item.id, { status: 'uploading', message: 'Uploading to storage...' })
        const fileData = await uploadFileToStorage(item.file)

        updateItem(item.id, { status: 'creating', message: 'Creating record...' })
        const { data: answerSheet, error: insertError } = await supabase
          .from('answer_sheets')
          .insert([
            {
              question_paper_id: formData.question_paper_id,
              class_id: formData.class_id,
              subject_id: formData.subject_id,
              file_url: fileData.file_url,
              file_name: fileData.file_name,
              file_hash: fileHash,
              status: 'pending',
              graded_by: user.id,
              extracted_roll_number: null
            }
          ])
          .select()
          .maybeSingle()

        if (insertError) throw insertError

        updateItem(item.id, {
          status: 'grading',
          message: 'Submitting for AI grading...',
          answerSheetId: answerSheet?.id || null
        })

        const maxAttempts = 3
        let gradedOk = false

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          if (stopRef.current) break
          updateItem(item.id, { status: 'grading', message: `AI grading (attempt ${attempt}/${maxAttempts})...` })

          const { data, error: gradeError } = await supabase.functions.invoke('grade-answer-sheet', {
            body: { answer_sheet_id: answerSheet.id }
          })

          if (!gradeError && data?.success !== false) {
            gradedOk = true
            break
          }

          const msg = gradeError?.message || data?.error || 'Grading failed'
          console.error('Grading error:', gradeError || data)

          if (attempt < maxAttempts && isRetryableGradingError(msg)) {
            const backoffMs = Math.min(15000, 1000 * Math.pow(2, attempt - 1))
            updateItem(item.id, { status: 'grading', message: `${msg} — retrying in ${Math.round(backoffMs / 1000)}s...` })
            await sleep(backoffMs)
            continue
          }

          throw new Error(msg)
        }

        if (!gradedOk && !stopRef.current) {
          throw new Error('Grading did not complete')
        }

        updateItem(item.id, { status: 'done', message: 'Uploaded and submitted for grading' })

        // Small delay between items to reduce API bursts
        await sleep(800)
      } catch (error) {
        updateItem(item.id, { status: 'error', message: error?.message || 'Failed' })
      }
    }

    setRunning(false)
    stopRef.current = false
  }

  const summary = useMemo(() => {
    const counts = { queued: 0, hashing: 0, uploading: 0, creating: 0, grading: 0, done: 0, duplicate: 0, error: 0 }
    for (const item of queue) {
      counts[item.status] = (counts[item.status] || 0) + 1
    }
    return counts
  }, [queue])

  const statusBadge = (status) => {
    const map = {
      queued: { cls: 'bg-gray-100 text-gray-700', icon: Clock, label: 'Queued' },
      hashing: { cls: 'bg-blue-100 text-blue-700', icon: Clock, label: 'Checking' },
      uploading: { cls: 'bg-blue-100 text-blue-700', icon: Upload, label: 'Uploading' },
      creating: { cls: 'bg-blue-100 text-blue-700', icon: Clock, label: 'Creating' },
      grading: { cls: 'bg-indigo-100 text-indigo-700', icon: Clock, label: 'Queuing' },
      done: { cls: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Done' },
      duplicate: { cls: 'bg-yellow-100 text-yellow-700', icon: AlertCircle, label: 'Duplicate' },
      error: { cls: 'bg-red-100 text-red-700', icon: AlertCircle, label: 'Error' }
    }
    const cfg = map[status] || map.queued
    const Icon = cfg.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
        <Icon size={12} />
        {cfg.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Files size={28} />
          <h1 className="text-2xl font-bold">Bulk Upload Answer Sheets</h1>
        </div>
        <p className="text-blue-100">
          Drag & drop multiple files, then submit them to AI grading in a queue.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
            <select
              value={formData.class_id}
              onChange={(e) =>
                setFormData({ class_id: e.target.value, subject_id: '', question_paper_id: '' })
              }
              disabled={running}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Select Class</option>
              {uniqueClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
            <select
              value={formData.subject_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, subject_id: e.target.value, question_paper_id: '' }))}
              disabled={!formData.class_id || running}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Select Subject</option>
              {availableSubjects.map((subj) => (
                <option key={subj.id} value={subj.id}>
                  {subj.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question Paper *</label>
            <select
              value={formData.question_paper_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, question_paper_id: e.target.value }))}
              disabled={!formData.class_id || !formData.subject_id || running}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Select Question Paper</option>
              {questionPapers.map((paper) => (
                <option key={paper.id} value={paper.id}>
                  {paper.title} ({paper.total_marks} marks)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
            running ? 'border-gray-200 bg-gray-50' : 'border-blue-200 bg-blue-50 hover:bg-blue-100'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => addFilesToQueue(e.target.files)}
            className="hidden"
            disabled={running}
          />

          <div className="flex items-center justify-center gap-2 text-blue-700 mb-2">
            <Upload size={20} />
            <span className="font-medium">Drag & drop files here</span>
          </div>
          <p className="text-sm text-gray-600 mb-4">or</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={running}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Select Files
          </button>
          <p className="text-xs text-gray-500 mt-3">Accepted: PDF, JPG, PNG</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-gray-700">
            <span className="font-medium">Queue:</span> {queue.length} files • Done {summary.done} • Errors {summary.error} • Duplicates {summary.duplicate}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={runQueue}
              disabled={running || queue.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Play size={16} />
              Start Queue
            </button>
            <button
              type="button"
              onClick={stopQueue}
              disabled={!running}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              <Square size={16} />
              Stop
            </button>
            <button
              type="button"
              onClick={clearQueue}
              disabled={running || queue.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50"
            >
              <Trash2 size={16} />
              Clear
            </button>
          </div>
        </div>

        {queue.length > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-600">
              <div className="col-span-6">File</div>
              <div className="col-span-2">Size</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Action</div>
            </div>
            <div className="divide-y divide-gray-100">
              {queue.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                  <div className="col-span-6">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.file.name}</p>
                    {item.message ? <p className="text-xs text-gray-500 truncate">{item.message}</p> : null}
                  </div>
                  <div className="col-span-2 text-sm text-gray-600">{formatBytes(item.file.size)}</div>
                  <div className="col-span-2">{statusBadge(item.status)}</div>
                  <div className="col-span-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={running}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      title="Remove"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          Files are uploaded one-by-one to avoid API overload. You can track completed grading in <span className="font-medium">Grading Results</span>.
        </div>
      </div>
    </div>
  )
}

export default BulkUploadAnswerSheets
