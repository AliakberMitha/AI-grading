import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Table from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import PasswordConfirmModal from '../../components/common/PasswordConfirmModal'
import {
  FileText,
  Search,
  Eye,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Download,
  Filter,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'

const AnswerSheetManagement = () => {
  const [answerSheets, setAnswerSheets] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [selectedSheet, setSelectedSheet] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isPasswordDeleteOpen, setIsPasswordDeleteOpen] = useState(false)
  const [pendingDeleteSheet, setPendingDeleteSheet] = useState(null)
  const [sheetToDelete, setSheetToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [classes, setClasses] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    graded: 0,
    error: 0
  })

  useEffect(() => {
    fetchAnswerSheets()
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .order('name')

      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      console.error('Failed to fetch classes:', error)
    }
  }

  const fetchAnswerSheets = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('answer_sheets')
        .select(`
          *,
          students (id, name, roll_number),
          classes (id, name),
          subjects (id, name),
          question_papers (id, title, total_marks),
          users:graded_by (id, itsid, email)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      const sheets = data || []
      setAnswerSheets(sheets)
      
      // Calculate stats
      setStats({
        total: sheets.length,
        pending: sheets.filter(s => s.status === 'pending' || s.status === 'processing').length,
        graded: sheets.filter(s => s.status === 'graded').length,
        error: sheets.filter(s => s.status === 'error').length
      })
    } catch (error) {
      toast.error('Failed to fetch answer sheets')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!sheetToDelete) return

    try {
      setDeleting(true)

      // Delete from storage if file exists
      if (sheetToDelete.file_url) {
        const filePath = sheetToDelete.file_url.split('/').pop()
        if (filePath) {
          await supabase.storage
            .from('answer-sheets')
            .remove([`uploads/${filePath}`])
        }
      }

      // Delete the record
      const { error } = await supabase
        .from('answer_sheets')
        .delete()
        .eq('id', sheetToDelete.id)

      if (error) throw error

      toast.success('Answer sheet deleted successfully')
      setIsDeleteModalOpen(false)
      setSheetToDelete(null)
      fetchAnswerSheets()
    } catch (error) {
      toast.error(error.message || 'Failed to delete answer sheet')
      console.error(error)
    } finally {
      setDeleting(false)
    }
  }

  const confirmDelete = (sheet) => {
    setPendingDeleteSheet(sheet)
    setIsPasswordDeleteOpen(true)
  }

  const viewDetails = (sheet) => {
    setSelectedSheet(sheet)
    setIsDetailModalOpen(true)
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Pending' },
      processing: { color: 'bg-blue-100 text-blue-700', icon: Loader2, label: 'Processing' },
      graded: { color: 'bg-green-100 text-green-700', icon: CheckCircle2, label: 'Graded' },
      error: { color: 'bg-red-100 text-red-700', icon: AlertCircle, label: 'Error' }
    }
    const badge = badges[status] || badges.pending
    const Icon = badge.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon size={12} className={status === 'processing' ? 'animate-spin' : ''} />
        {badge.label}
      </span>
    )
  }

  const getGradeBadge = (grade) => {
    if (!grade) return '-'
    
    const colors = {
      'A+': 'bg-green-100 text-green-700',
      'A': 'bg-green-100 text-green-700',
      'B+': 'bg-blue-100 text-blue-700',
      'B': 'bg-blue-100 text-blue-700',
      'C+': 'bg-yellow-100 text-yellow-700',
      'C': 'bg-yellow-100 text-yellow-700',
      'D': 'bg-orange-100 text-orange-700',
      'F': 'bg-red-100 text-red-700'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${colors[grade] || 'bg-gray-100 text-gray-700'}`}>
        {grade}
      </span>
    )
  }

  const getRollNumber = (sheet) => {
    return sheet.extracted_roll_number || sheet.manual_roll_number || sheet.students?.roll_number || '-'
  }

  const filteredSheets = answerSheets.filter(sheet => {
    const rollNumber = getRollNumber(sheet).toLowerCase()
    const matchesSearch = 
      rollNumber.includes(searchTerm.toLowerCase()) ||
      sheet.students?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sheet.classes?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sheet.subjects?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sheet.users?.itsid?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || sheet.status === statusFilter
    const matchesClass = classFilter === 'all' || sheet.class_id === classFilter

    return matchesSearch && matchesStatus && matchesClass
  })

  const columns = [
    {
      header: 'Roll/Magic No.',
      accessor: 'roll_number',
      render: (row) => (
        <div>
          {row.extracted_roll_number ? (
            <>
              <p className="font-medium text-indigo-700">{row.extracted_roll_number}</p>
              <p className="text-xs text-gray-500">AI Extracted</p>
            </>
          ) : row.manual_roll_number ? (
            <>
              <p className="font-medium text-gray-800">{row.manual_roll_number}</p>
              <p className="text-xs text-gray-500">Manual Entry</p>
            </>
          ) : row.students?.roll_number ? (
            <>
              <p className="font-medium text-gray-800">{row.students.roll_number}</p>
              <p className="text-xs text-gray-500">{row.students.name}</p>
            </>
          ) : (
            <p className="text-gray-400">Not identified</p>
          )}
        </div>
      )
    },
    {
      header: 'Class / Subject',
      accessor: 'class_subject',
      render: (row) => (
        <div>
          <p className="text-gray-700">{row.classes?.name}</p>
          <p className="text-xs text-gray-500">{row.subjects?.name}</p>
        </div>
      )
    },
    {
      header: 'Question Paper',
      accessor: 'question_paper',
      render: (row) => (
        <span className="text-gray-600 text-sm">{row.question_papers?.title || '-'}</span>
      )
    },
    {
      header: 'Graded By',
      accessor: 'graded_by',
      render: (row) => (
        <div>
          <p className="text-gray-700 text-sm">{row.users?.itsid || '-'}</p>
          <p className="text-xs text-gray-500">{row.users?.email}</p>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => getStatusBadge(row.status)
    },
    {
      header: 'Score / Grade',
      accessor: 'score',
      render: (row) => (
        <div>
          {row.status === 'graded' ? (
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800">
                {row.total_score?.toFixed(1) || 0}
              </span>
              {getGradeBadge(row.grade)}
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      )
    },
    {
      header: 'Date',
      accessor: 'created_at',
      render: (row) => (
        <span className="text-gray-500 text-sm">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <PasswordConfirmModal
        isOpen={isPasswordDeleteOpen}
        title="Password Required"
        message="Enter your password to delete this answer sheet."
        confirmLabel="Verify & Continue"
        onCancel={() => {
          setIsPasswordDeleteOpen(false)
          setPendingDeleteSheet(null)
        }}
        onVerified={async () => {
          const sheet = pendingDeleteSheet
          setIsPasswordDeleteOpen(false)
          setPendingDeleteSheet(null)
          setSheetToDelete(sheet)
          setIsDeleteModalOpen(true)
        }}
      />
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <FileText size={28} />
          <h1 className="text-2xl font-bold">Answer Sheet Management</h1>
        </div>
        <p className="text-purple-100">
          View, search, and manage all graded answer sheets across the system.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Sheets</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Pending/Processing</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Graded</p>
          <p className="text-2xl font-bold text-green-600">{stats.graded}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Errors</p>
          <p className="text-2xl font-bold text-red-600">{stats.error}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by roll/magic number, student, class, grader..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="all">All Classes</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="graded">Graded</option>
          <option value="error">Error</option>
        </select>
        <button
          onClick={fetchAnswerSheets}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredSheets}
        loading={loading}
        emptyMessage="No answer sheets found"
        actions={(row) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => viewDetails(row)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="View Details"
            >
              <Eye size={16} />
            </button>
            {row.file_url && (
              <a
                href={row.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Download File"
              >
                <Download size={16} />
              </a>
            )}
            <button
              onClick={() => confirmDelete(row)}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      />

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Answer Sheet Details"
        size="lg"
      >
        {selectedSheet && (
          <div className="space-y-6">
            {/* Roll Number & Paper Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm text-gray-500">Roll / Magic Number</p>
                {selectedSheet.extracted_roll_number ? (
                  <>
                    <p className="font-bold text-xl text-indigo-700">{selectedSheet.extracted_roll_number}</p>
                    <p className="text-xs text-green-600">AI Extracted</p>
                  </>
                ) : selectedSheet.manual_roll_number ? (
                  <>
                    <p className="font-bold text-xl text-gray-800">{selectedSheet.manual_roll_number}</p>
                    <p className="text-xs text-gray-500">Manual Entry</p>
                  </>
                ) : selectedSheet.students?.roll_number ? (
                  <>
                    <p className="font-bold text-xl text-gray-800">{selectedSheet.students.roll_number}</p>
                    <p className="text-xs text-gray-500">{selectedSheet.students.name}</p>
                  </>
                ) : (
                  <p className="font-medium text-gray-400">Not identified</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Question Paper</p>
                <p className="font-medium text-gray-800">{selectedSheet.question_papers?.title}</p>
                <p className="text-xs text-gray-500">
                  {selectedSheet.classes?.name} - {selectedSheet.subjects?.name}
                </p>
              </div>
            </div>

            {/* Grader Info */}
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm text-blue-600 font-medium">Graded By</p>
              <p className="font-medium text-gray-800">{selectedSheet.users?.itsid || 'Unknown'}</p>
              <p className="text-xs text-gray-500">{selectedSheet.users?.email}</p>
              <p className="text-xs text-gray-500 mt-1">
                Uploaded: {new Date(selectedSheet.created_at).toLocaleString()}
              </p>
            </div>

            {/* Confidence Score */}
            {selectedSheet.extracted_roll_number && selectedSheet.roll_number_confidence && (
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-indigo-600 font-medium">AI Extraction Confidence</p>
                    <p className={`text-2xl font-bold ${
                      selectedSheet.roll_number_confidence >= 80 ? 'text-green-600' :
                      selectedSheet.roll_number_confidence >= 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {selectedSheet.roll_number_confidence}%
                    </p>
                  </div>
                  {selectedSheet.roll_number_confidence < 80 && (
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <AlertCircle size={16} />
                      <span>Low confidence</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Score Breakdown */}
            {selectedSheet.status === 'graded' && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <p className="text-sm text-blue-600">Content Score</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {selectedSheet.content_score?.toFixed(1) || 0}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-xl">
                    <p className="text-sm text-purple-600">Language Score</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {selectedSheet.language_score?.toFixed(1) || 0}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <p className="text-sm text-green-600">Total Score</p>
                    <p className="text-2xl font-bold text-green-700">
                      {selectedSheet.total_score?.toFixed(1) || 0} / {selectedSheet.question_papers?.total_marks || 100}
                    </p>
                  </div>
                </div>

                {/* Grade */}
                <div className="text-center p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white">
                  <p className="text-sm opacity-90">Final Grade</p>
                  <p className="text-4xl font-bold">{selectedSheet.grade || 'N/A'}</p>
                </div>

                {/* Remarks */}
                {selectedSheet.remarks && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">AI Remarks</p>
                    <div className="p-4 bg-gray-50 rounded-xl text-gray-700 whitespace-pre-wrap">
                      {selectedSheet.remarks}
                    </div>
                  </div>
                )}

                {/* Issues */}
                {selectedSheet.issues && selectedSheet.issues.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Areas for Improvement</p>
                    <ul className="space-y-2">
                      {selectedSheet.issues.map((issue, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                          <AlertCircle size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Section-wise Results */}
                {selectedSheet.section_wise_results && selectedSheet.section_wise_results.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Section-wise Breakdown</p>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {selectedSheet.section_wise_results.map((section, sIndex) => (
                        <div key={sIndex} className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="bg-gray-100 px-4 py-2 flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-gray-800">Section {section.section}</span>
                              {section.section_name && (
                                <span className="text-gray-500 ml-2">- {section.section_name}</span>
                              )}
                            </div>
                            <span className="text-sm font-medium text-indigo-600">
                              {section.section_total?.toFixed(1) || 0} / {section.section_max || 0}
                            </span>
                          </div>
                          {section.questions && section.questions.length > 0 && (
                            <div className="divide-y divide-gray-100">
                              {section.questions.map((q, qIndex) => (
                                <div key={qIndex} className="p-3 hover:bg-gray-50">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-800">
                                        Q{q.question_number}. {q.question_text}
                                      </p>
                                      {q.student_answer && (
                                        <p className="text-xs text-gray-600 mt-1 bg-blue-50 p-2 rounded">
                                          <span className="font-medium">Student:</span> {q.student_answer}
                                        </p>
                                      )}
                                      {q.expected_answer && (
                                        <p className="text-xs text-gray-600 mt-1 bg-green-50 p-2 rounded">
                                          <span className="font-medium">Expected:</span> {q.expected_answer}
                                        </p>
                                      )}
                                      {q.feedback && (
                                        <p className="text-xs text-gray-500 mt-1 italic">{q.feedback}</p>
                                      )}
                                    </div>
                                    <span className={`text-sm font-bold flex-shrink-0 ${
                                      q.marks_obtained >= q.max_marks * 0.8 ? 'text-green-600' :
                                      q.marks_obtained >= q.max_marks * 0.5 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      {q.marks_obtained?.toFixed(1) || 0}/{q.max_marks || 0}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {section.section_remarks && (
                            <div className="bg-gray-50 px-4 py-2 text-xs text-gray-600 border-t">
                              {section.section_remarks}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Re-evaluation info */}
                {selectedSheet.is_re_evaluated && (
                  <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg text-sm text-orange-700">
                    <RefreshCw size={16} />
                    Re-evaluated {selectedSheet.re_evaluation_count} time(s)
                  </div>
                )}
              </>
            )}

            {/* Pending/Processing Status */}
            {(selectedSheet.status === 'pending' || selectedSheet.status === 'processing') && (
              <div className="text-center py-8">
                <Loader2 size={48} className="mx-auto text-blue-500 animate-spin mb-4" />
                <p className="text-gray-600">AI grading in progress...</p>
                <p className="text-sm text-gray-500">Results will appear when ready.</p>
              </div>
            )}

            {/* Error Status */}
            {selectedSheet.status === 'error' && (
              <div className="text-center py-8">
                <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                <p className="text-gray-600">Grading failed</p>
                <p className="text-sm text-gray-500">This answer sheet encountered an error during processing.</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              {selectedSheet.file_url && (
                <a
                  href={selectedSheet.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <Download size={18} />
                  Download File
                </a>
              )}
              <button
                onClick={() => {
                  setIsDetailModalOpen(false)
                  confirmDelete(selectedSheet)
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Answer Sheet"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl text-red-700">
            <AlertCircle size={24} />
            <div>
              <p className="font-medium">Are you sure you want to delete this answer sheet?</p>
              <p className="text-sm opacity-80">This action cannot be undone.</p>
            </div>
          </div>

          {sheetToDelete && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500">Roll / Magic Number</p>
              <p className="font-bold text-gray-800">
                {sheetToDelete.extracted_roll_number || sheetToDelete.manual_roll_number || sheetToDelete.students?.roll_number || 'Not identified'}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {sheetToDelete.classes?.name} - {sheetToDelete.subjects?.name}
              </p>
              {sheetToDelete.status === 'graded' && (
                <p className="text-xs text-gray-500">
                  Score: {sheetToDelete.total_score?.toFixed(1)} | Grade: {sheetToDelete.grade}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deleting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={18} />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default AnswerSheetManagement
