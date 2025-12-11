import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/common/Modal'
import {
  History,
  RefreshCw,
  Loader2,
  Search,
  Filter,
  ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

const PAGE_SIZE = 200

const formatNumber = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return Number(value).toFixed(2)
}

const formatDate = (isoString) => {
  if (!isoString) return '—'
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

const ReevaluationLogs = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, user])

  const fetchLogs = async () => {
    try {
      if (!user) return

      setLoading(true)

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError

      const accessToken = sessionData?.session?.access_token
      const headers = accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined

      const { data, error } = await supabase.functions.invoke('list-re-evaluation-logs', {
        body: {
          type: typeFilter === 'all' ? null : typeFilter
        },
        headers
      })

      if (error) throw error
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch re-evaluation logs')
      }

      setLogs(data?.data || [])
    } catch (error) {
      console.error('Failed to load re-evaluation logs:', error)
      toast.error('Failed to load re-evaluation logs')
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs
    const term = searchTerm.trim().toLowerCase()
    if (!term) return logs

    return logs.filter((log) => {
      const studentName = log.answer_sheets?.students?.name?.toLowerCase() || ''
      const rollNumber = log.answer_sheets?.students?.roll_number?.toLowerCase() || ''
      const qpTitle = log.answer_sheets?.question_papers?.title?.toLowerCase() || ''
      const gradeOld = log.previous_grade?.toLowerCase() || ''
      const gradeNew = log.new_grade?.toLowerCase() || ''
      const triggeredBy = log.triggered_by_user?.itsid?.toLowerCase() || log.triggered_by_user?.email?.toLowerCase() || ''
      const magicNumber = (log.answer_sheets?.extracted_roll_number || '')
        .toString()
        .toLowerCase()

      return (
        studentName.includes(term) ||
        rollNumber.includes(term) ||
        qpTitle.includes(term) ||
        gradeOld.includes(term) ||
        gradeNew.includes(term) ||
        (log.section_name || '').toLowerCase().includes(term) ||
        triggeredBy.includes(term) ||
        magicNumber.includes(term)
      )
    })
  }, [logs, searchTerm])

  const openDetails = (log) => {
    setSelectedLog(log)
    setModalOpen(true)
  }

  const closeDetails = () => {
    setModalOpen(false)
    setSelectedLog(null)
  }

  const renderTypeBadge = (type) => {
    const styles =
      type === 'section'
        ? 'bg-amber-100 text-amber-700 border border-amber-200'
        : 'bg-blue-100 text-blue-700 border border-blue-200'

    const label = type === 'section' ? 'Section' : 'Full Paper'

    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles}`}>{label}</span>
  }

  const renderDelta = (oldValue, newValue) => {
    if (oldValue === null || oldValue === undefined) return '—'
    if (newValue === null || newValue === undefined) return '—'

    const delta = Number(newValue) - Number(oldValue)
    if (Number.isNaN(delta) || delta === 0) return 'No change'
    const direction = delta > 0 ? '+' : ''
    return `${direction}${delta.toFixed(2)}`
  }

  const renderDetailsModal = () => {
    if (!selectedLog) return null

    const { evaluation_type: type, details } = selectedLog
    const previousMarks = details?.previous_question_marks || []
    const newMarks = details?.new_question_marks || []
    const questionMap = new Map()
    const studentInfo = selectedLog.answer_sheets?.students
    const magicNumber = selectedLog.answer_sheets?.extracted_roll_number
    const magicConfidence = selectedLog.answer_sheets?.roll_number_confidence

    previousMarks.forEach((q) => {
      if (!q) return
      questionMap.set(String(q.question_number), {
        previous: q.marks_obtained
      })
    })

    newMarks.forEach((q) => {
      if (!q) return
      const key = String(q.question_number)
      const existing = questionMap.get(key) || {}
      questionMap.set(key, {
        ...existing,
        current: q.marks_obtained
      })
    })

    const questionRows = Array.from(questionMap.entries())
      .sort((a, b) => Number(a[0]) - Number(b[0]))

    return (
      <Modal
        isOpen={modalOpen}
        onClose={closeDetails}
        title={`Re-evaluation Details (${type === 'section' ? 'Section' : 'Full Paper'})`}
        size={type === 'section' ? 'xl' : 'lg'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <p className="text-xs uppercase text-gray-500 font-medium">Student</p>
              <p className="text-sm text-gray-900 mt-1 font-semibold">{studentInfo?.name || '—'}</p>
              <p className="text-sm text-gray-600">Roll #: {studentInfo?.roll_number || '—'}</p>
            </div>
            <div className="p-4 bg-white border border-blue-200 rounded-lg">
              <p className="text-xs uppercase text-blue-500 font-medium">Magic Number (AI)</p>
              <p className="text-sm text-gray-900 mt-1 font-semibold">{magicNumber || '—'}</p>
              <p className="text-xs text-gray-500">Confidence: {magicNumber ? `${Math.round(magicConfidence ?? 0)}%` : '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs uppercase text-gray-500 font-medium">Previous totals</p>
              <p className="text-sm text-gray-700 mt-1">Total: {formatNumber(selectedLog.previous_total_score)}</p>
              {type === 'section' && (
                <p className="text-sm text-gray-700">Section: {formatNumber(selectedLog.previous_section_score)}</p>
              )}
              <p className="text-sm text-gray-700">Grade: {selectedLog.previous_grade || '—'}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-xs uppercase text-green-700 font-medium">Updated totals</p>
              <p className="text-sm text-green-700 mt-1">Total: {formatNumber(selectedLog.new_total_score)}</p>
              {type === 'section' && (
                <p className="text-sm text-green-700">Section: {formatNumber(selectedLog.new_section_score)}</p>
              )}
              <p className="text-sm text-green-700">Grade: {selectedLog.new_grade || '—'}</p>
            </div>
          </div>

          {type === 'full' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs uppercase text-gray-500 font-medium">Previous break-up</p>
                <p className="text-sm text-gray-700 mt-1">
                  Content: {formatNumber(details?.previous_content_score)}
                </p>
                <p className="text-sm text-gray-700">
                  Language: {formatNumber(details?.previous_language_score)}
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-xs uppercase text-blue-700 font-medium">Updated break-up</p>
                <p className="text-sm text-blue-700 mt-1">
                  Content: {formatNumber(details?.new_content_score)}
                </p>
                <p className="text-sm text-blue-700">
                  Language: {formatNumber(details?.new_language_score)}
                </p>
              </div>
            </div>
          )}

          {type === 'section' && questionRows.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Question-wise marks</p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Question</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Previous</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Updated</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {questionRows.map(([questionNumber, values]) => {
                      const previous = formatNumber(values.previous)
                      const current = formatNumber(values.current)
                      const delta = renderDelta(values.previous, values.current)
                      return (
                        <tr key={questionNumber}>
                          <td className="px-3 py-2 text-gray-700">{questionNumber}</td>
                          <td className="px-3 py-2 text-gray-700">{previous}</td>
                          <td className="px-3 py-2 text-gray-700">{current}</td>
                          <td className="px-3 py-2 text-gray-700">{delta}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-400">
            Log ID: {selectedLog.id}
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <History size={24} className="text-blue-600" />
            Re-evaluation History
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track every full-paper and section re-check with before/after marks.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1 md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student, roll number, question paper, grade, section, or requester"
              className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="col-span-1">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
            <Filter className="size-4 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex-1 bg-transparent text-sm focus:outline-none"
            >
              <option value="all">All evaluations</option>
              <option value="full">Full paper only</option>
              <option value="section">Section only</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">When</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Student</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Question Paper</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Section</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Score Δ</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Grade</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Requested By</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!loading && filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500 text-sm">
                    No re-evaluation records found.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500 text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Loading logs...
                    </div>
                  </td>
                </tr>
              )}

              {!loading && filteredLogs.map((log) => {
                const deltaLabel = renderDelta(log.previous_total_score, log.new_total_score)
                const student = log.answer_sheets?.students
                const qp = log.answer_sheets?.question_papers
                const requester = log.triggered_by_user
                const magicNumber = log.answer_sheets?.extracted_roll_number
                const magicConfidence = log.answer_sheets?.roll_number_confidence

                return (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-700">{formatDate(log.created_at)}</td>
                    <td className="px-4 py-3">{renderTypeBadge(log.evaluation_type)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-800">{student?.name || '—'}</span>
                        <span className="text-xs text-gray-500">Roll #: {student?.roll_number || '—'}</span>
                        <span className="text-xs text-blue-500">
                          Magic #: {magicNumber || '—'}
                          {magicNumber ? ` (${Math.round(magicConfidence ?? 0)}%)` : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {qp?.title || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {log.evaluation_type === 'section'
                        ? log.section_name || `Section ${log.section_index + 1}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="flex flex-col">
                        <span>
                          {formatNumber(log.previous_total_score)} → {formatNumber(log.new_total_score)}
                        </span>
                        <span className="text-xs text-gray-500">{deltaLabel}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="flex items-center gap-2">
                        <span>{log.previous_grade || '—'}</span>
                        <span>→</span>
                        <span className="font-semibold text-green-600">{log.new_grade || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-800">{requester?.itsid || '—'}</span>
                        <span className="text-xs text-gray-500">{requester?.email || ''}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openDetails(log)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                      >
                        <ExternalLink className="size-4" />
                        View
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
          <span>
            Showing {Math.min(filteredLogs.length, PAGE_SIZE)} of {logs.length} fetched entries.
          </span>
          <span>
            Logs are kept in descending order of re-evaluation time.
          </span>
        </div>
      </div>

      {renderDetailsModal()}
    </div>
  )
}

export default ReevaluationLogs
