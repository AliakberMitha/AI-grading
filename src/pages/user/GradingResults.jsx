import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Table from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import {
  FileText,
  Search,
  Eye,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Download,
  Trash2,
  X,
  Edit3
} from 'lucide-react'
import toast from 'react-hot-toast'

const GradingResults = () => {
  const { user } = useAuth()
  const [answerSheets, setAnswerSheets] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedSheet, setSelectedSheet] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [sheetToDelete, setSheetToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [reEvaluating, setReEvaluating] = useState(null)
  const [reEvaluatingSection, setReEvaluatingSection] = useState(null)
  const [userPermissions, setUserPermissions] = useState({})
  const [editingMarks, setEditingMarks] = useState(null) // {sectionIndex, questionIndex, value}

  useEffect(() => {
    if (user) {
      fetchAnswerSheets()
      fetchUserPermissions()
      
      // Set up real-time subscription for status updates
      const subscription = supabase
        .channel('answer_sheets_changes')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'answer_sheets',
          filter: `graded_by=eq.${user.id}`
        }, (payload) => {
          setAnswerSheets(prev => 
            prev.map(sheet => 
              sheet.id === payload.new.id ? { ...sheet, ...payload.new } : sheet
            )
          )
        })
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user])

  const fetchUserPermissions = async () => {
    try {
      // First try to fetch with new columns
      const { data, error } = await supabase
        .from('user_assignments')
        .select('class_id, subject_id, can_edit_marks, can_reevaluate')
        .eq('user_id', user.id)

      if (error) {
        console.error('Permissions query error:', error)
        // If new columns don't exist, try without them
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('user_assignments')
          .select('class_id, subject_id')
          .eq('user_id', user.id)
        
        if (fallbackError) throw fallbackError
        
        // Default to false for new permissions
        const permMap = {}
        fallbackData?.forEach(p => {
          const key = `${p.class_id}-${p.subject_id}`
          permMap[key] = {
            can_edit_marks: false,
            can_reevaluate: false
          }
        })
        setUserPermissions(permMap)
        console.log('Using fallback permissions (new columns may not exist)')
        return
      }
      
      // Create a map for quick lookup
      const permMap = {}
      data?.forEach(p => {
        const key = `${p.class_id}-${p.subject_id}`
        permMap[key] = {
          can_edit_marks: p.can_edit_marks === true,
          can_reevaluate: p.can_reevaluate === true
        }
      })
      setUserPermissions(permMap)
      console.log('User permissions loaded:', permMap)
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
      setUserPermissions({})
    }
  }

  const getPermissions = (sheet) => {
    if (!sheet) return { can_edit_marks: false, can_reevaluate: false }
    const key = `${sheet.class_id}-${sheet.subject_id}`
    const perms = userPermissions[key] || { can_edit_marks: false, can_reevaluate: false }
    console.log('Getting permissions for', key, ':', perms)
    return perms
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
          question_papers (id, title, total_marks)
        `)
        .eq('graded_by', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAnswerSheets(data || [])
    } catch (error) {
      toast.error('Failed to fetch results')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleReEvaluate = async (sheet) => {
    if (sheet.re_evaluation_count >= 3) {
      toast.error('Maximum re-evaluation limit (3) reached')
      return
    }

    if (!window.confirm('Request AI re-evaluation for this answer sheet?')) {
      return
    }

    try {
      setReEvaluating(sheet.id)

      // Update status to processing
      const { error: updateError } = await supabase
        .from('answer_sheets')
        .update({
          status: 'processing',
          is_re_evaluated: true,
          re_evaluation_count: (sheet.re_evaluation_count || 0) + 1
        })
        .eq('id', sheet.id)

      if (updateError) throw updateError

      // Trigger AI grading
      const { error: gradeError } = await supabase.functions.invoke('grade-answer-sheet', {
        body: { answer_sheet_id: sheet.id, is_re_evaluation: true, requested_by: user.id }
      })

      if (gradeError) {
        console.error('Grading error:', gradeError)
      }

      toast.success('Re-evaluation requested! Please wait for AI processing.')
      fetchAnswerSheets()
    } catch (error) {
      toast.error(error.message || 'Re-evaluation failed')
      console.error(error)
    } finally {
      setReEvaluating(null)
    }
  }

  const handleSectionReEvaluate = async (sheet, sectionIndex) => {
    const permissions = getPermissions(sheet)
    if (!permissions.can_reevaluate) {
      toast.error('You do not have permission to re-evaluate sections')
      return
    }

    if (!window.confirm(`Re-evaluate Section ${sheet.section_wise_results[sectionIndex]?.section || sectionIndex + 1}?`)) {
      return
    }

    try {
      setReEvaluatingSection(sectionIndex)

      const { data, error } = await supabase.functions.invoke('reevaluate-section', {
        body: { 
          answer_sheet_id: sheet.id, 
          section_index: sectionIndex,
          requested_by: user.id
        }
      })

      if (error) throw error

      toast.success('Section re-evaluated successfully!')
      
      // Refresh the sheet data
      fetchAnswerSheets()
      
      // Update selected sheet if viewing details
      if (selectedSheet?.id === sheet.id) {
        const { data: updatedSheet } = await supabase
          .from('answer_sheets')
          .select(`*, students (id, name, roll_number), classes (id, name), subjects (id, name), question_papers (id, title, total_marks)`)
          .eq('id', sheet.id)
          .single()
        
        if (updatedSheet) {
          setSelectedSheet(updatedSheet)
        }
      }
    } catch (error) {
      toast.error(error.message || 'Section re-evaluation failed')
      console.error(error)
    } finally {
      setReEvaluatingSection(null)
    }
  }

  const handleEditMarks = async (sheet, sectionIndex, questionIndex, newMarks) => {
    const permissions = getPermissions(sheet)
    if (!permissions.can_edit_marks) {
      toast.error('You do not have permission to edit marks')
      return
    }

    try {
      const updatedResults = [...sheet.section_wise_results]
      const question = updatedResults[sectionIndex].questions[questionIndex]
      const maxMarks = question.max_marks || 0
      
      // Validate marks
      const marks = parseFloat(newMarks)
      if (isNaN(marks) || marks < 0 || marks > maxMarks) {
        toast.error(`Marks must be between 0 and ${maxMarks}`)
        return
      }

      // Update question marks
      updatedResults[sectionIndex].questions[questionIndex].marks_obtained = marks
      
      // Recalculate section total
      updatedResults[sectionIndex].section_total = updatedResults[sectionIndex].questions
        .filter(q => !q.is_extra)
        .reduce((sum, q) => sum + (q.marks_obtained || 0), 0)

      // Recalculate total score
      let newTotal = 0
      for (const section of updatedResults) {
        newTotal += section.section_total || 0
      }
      
      const maxTotal = sheet.question_papers?.total_marks || 100
      newTotal = Math.min(newTotal, maxTotal)

      // Calculate new grade
      const percentage = (newTotal / maxTotal) * 100
      let grade = 'F'
      if (percentage >= 90) grade = 'A+'
      else if (percentage >= 80) grade = 'A'
      else if (percentage >= 70) grade = 'B+'
      else if (percentage >= 60) grade = 'B'
      else if (percentage >= 50) grade = 'C+'
      else if (percentage >= 40) grade = 'C'
      else if (percentage >= 33) grade = 'D'

      // Update in database
      const { error } = await supabase
        .from('answer_sheets')
        .update({
          section_wise_results: updatedResults,
          total_score: newTotal,
          grade,
          content_score: newTotal * 0.6,
          language_score: newTotal * 0.4
        })
        .eq('id', sheet.id)

      if (error) throw error

      toast.success('Marks updated successfully!')
      setEditingMarks(null)
      fetchAnswerSheets()
      
      // Update selected sheet
      if (selectedSheet?.id === sheet.id) {
        setSelectedSheet({
          ...selectedSheet,
          section_wise_results: updatedResults,
          total_score: newTotal,
          grade
        })
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update marks')
      console.error(error)
    }
  }

  const confirmDelete = (sheet) => {
    setSheetToDelete(sheet)
    setIsDeleteModalOpen(true)
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

  const filteredSheets = answerSheets.filter(sheet => {
    const matchesSearch = 
      sheet.extracted_roll_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sheet.manual_roll_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sheet.students?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sheet.students?.roll_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sheet.classes?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sheet.subjects?.name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || sheet.status === statusFilter

    return matchesSearch && matchesStatus
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
      header: 'Status',
      accessor: 'status',
      render: (row) => getStatusBadge(row.status)
    },
    {
      header: 'Score',
      accessor: 'score',
      render: (row) => (
        <div>
          {row.status === 'graded' ? (
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800">
                {row.total_score?.toFixed(1) || 0} / {row.question_papers?.total_marks || 100}
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
      header: 'Uploaded',
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
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2 size={28} />
          <h1 className="text-2xl font-bold">Grading Results</h1>
        </div>
        <p className="text-green-100">
          View AI-generated grades, scores, and detailed feedback for uploaded answer sheets.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Uploads</p>
          <p className="text-2xl font-bold text-gray-800">{answerSheets.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">
            {answerSheets.filter(s => s.status === 'pending' || s.status === 'processing').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Graded</p>
          <p className="text-2xl font-bold text-green-600">
            {answerSheets.filter(s => s.status === 'graded').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Avg Score</p>
          <p className="text-2xl font-bold text-blue-600">
            {answerSheets.filter(s => s.status === 'graded' && s.total_score).length > 0
              ? (answerSheets
                  .filter(s => s.status === 'graded' && s.total_score)
                  .reduce((sum, s) => sum + s.total_score, 0) /
                  answerSheets.filter(s => s.status === 'graded' && s.total_score).length
                ).toFixed(1)
              : '-'
            }
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by student, class, or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        emptyMessage="No answer sheets uploaded yet"
        actions={(row) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => viewDetails(row)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="View Details"
            >
              <Eye size={16} />
            </button>
            {row.status === 'graded' && (
              <button
                onClick={() => handleReEvaluate(row)}
                disabled={reEvaluating === row.id || row.re_evaluation_count >= 3}
                className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                title={row.re_evaluation_count >= 3 ? 'Max re-evaluations reached' : 'Re-evaluate'}
              >
                {reEvaluating === row.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
              </button>
            )}
            {row.file_url && (
              <a
                href={row.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Download"
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
        title="Grading Details"
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
                      <span>Low confidence - please verify</span>
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
                    <div className="space-y-4">
                      {selectedSheet.section_wise_results.map((section, sIndex) => {
                        const permissions = getPermissions(selectedSheet)
                        return (
                        <div key={sIndex} className="border border-gray-200 rounded-xl overflow-hidden">
                          {/* Section Header */}
                          <div className="bg-gray-100 px-4 py-2 flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-gray-800">
                                Section {section.section}
                              </span>
                              {section.section_name && (
                                <span className="text-gray-500 ml-2">- {section.section_name}</span>
                              )}
                              {section.section_type && (
                                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                  {section.section_type}
                                </span>
                              )}
                              {section.attempt_required && (
                                <span className="ml-2 text-xs text-orange-600">
                                  (Attempt {section.attempt_required})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-indigo-600">
                                {section.section_total?.toFixed(1) || 0} / {section.section_max || 0}
                              </span>
                              {permissions.can_reevaluate && (
                                <button
                                  onClick={() => handleSectionReEvaluate(selectedSheet, sIndex)}
                                  disabled={reEvaluatingSection === sIndex}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
                                  title="Re-evaluate this section"
                                >
                                  {reEvaluatingSection === sIndex ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <RefreshCw size={12} />
                                  )}
                                  Re-evaluate
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {/* Questions */}
                          {section.questions && section.questions.length > 0 && (
                            <div className="divide-y divide-gray-100">
                              {section.questions.map((q, qIndex) => (
                                <div key={qIndex} className={`p-3 hover:bg-gray-50 ${q.is_extra ? 'bg-yellow-50' : ''}`}>
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-gray-800">
                                          Q{q.question_number}
                                        </p>
                                        {q.question_type && (
                                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                            {q.question_type}
                                          </span>
                                        )}
                                        {q.is_extra && (
                                          <span className="px-1.5 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded">
                                            Extra - Not Graded
                                          </span>
                                        )}
                                        {q.is_correct !== undefined && (
                                          <span className={`px-1.5 py-0.5 text-xs rounded ${
                                            q.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                          }`}>
                                            {q.is_correct ? '✓ Correct' : '✗ Incorrect'}
                                          </span>
                                        )}
                                      </div>
                                      {q.question_text && (
                                        <p className="text-xs text-gray-600 mt-1">{q.question_text}</p>
                                      )}
                                      {q.student_answer && (
                                        <p className="text-xs text-gray-600 mt-1 bg-blue-50 p-2 rounded">
                                          <span className="font-medium">Student:</span> {q.student_answer}
                                        </p>
                                      )}
                                      {q.correct_answer && (
                                        <p className="text-xs text-gray-600 mt-1 bg-green-50 p-2 rounded">
                                          <span className="font-medium">Expected:</span> {q.correct_answer}
                                        </p>
                                      )}
                                      {q.feedback && (
                                        <p className="text-xs text-gray-500 mt-1 italic">
                                          {q.feedback}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      {editingMarks?.sectionIndex === sIndex && editingMarks?.questionIndex === qIndex ? (
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="number"
                                            min="0"
                                            max={q.max_marks || 0}
                                            step="0.5"
                                            defaultValue={q.marks_obtained || 0}
                                            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                                            autoFocus
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                handleEditMarks(selectedSheet, sIndex, qIndex, e.target.value)
                                              } else if (e.key === 'Escape') {
                                                setEditingMarks(null)
                                              }
                                            }}
                                            onBlur={(e) => {
                                              handleEditMarks(selectedSheet, sIndex, qIndex, e.target.value)
                                            }}
                                          />
                                          <span className="text-sm text-gray-500">/ {q.max_marks || 0}</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1">
                                          <span className={`text-sm font-bold ${
                                            q.is_extra ? 'text-gray-400' :
                                            q.marks_obtained >= (q.max_marks || 0) * 0.8 ? 'text-green-600' :
                                            q.marks_obtained >= (q.max_marks || 0) * 0.5 ? 'text-yellow-600' :
                                            'text-red-600'
                                          }`}>
                                            {q.marks_obtained?.toFixed(1) || 0} / {q.max_marks || 0}
                                          </span>
                                          {permissions.can_edit_marks && !q.is_extra && (
                                            <button
                                              onClick={() => setEditingMarks({ sectionIndex: sIndex, questionIndex: qIndex })}
                                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                              title="Edit marks"
                                            >
                                              <Edit3 size={12} />
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Section Remarks */}
                          {section.section_remarks && (
                            <div className="bg-gray-50 px-4 py-2 text-xs text-gray-600 border-t">
                              {section.section_remarks}
                            </div>
                          )}
                        </div>
                      )})}
                    </div>
                  </div>
                )}

                {/* Extracted Answers (if no section-wise but has extracted answers) */}
                {(!selectedSheet.section_wise_results || selectedSheet.section_wise_results.length === 0) && 
                 selectedSheet.extracted_answers && selectedSheet.extracted_answers.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Extracted Student Answers</p>
                    <div className="space-y-2">
                      {selectedSheet.extracted_answers.map((ans, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-700">
                            Q{ans.question_number} {ans.section && `(Section ${ans.section})`}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">{ans.answer_text}</p>
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
                <p className="text-sm text-gray-500">Results will appear automatically when ready.</p>
              </div>
            )}

            {/* Error Status */}
            {selectedSheet.status === 'error' && (
              <div className="text-center py-8">
                <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                <p className="text-gray-600">Grading failed</p>
                <p className="text-sm text-gray-500">Please try re-evaluating this answer sheet.</p>
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
              {selectedSheet.status === 'graded' && selectedSheet.re_evaluation_count < 3 && (
                <button
                  onClick={() => {
                    handleReEvaluate(selectedSheet)
                    setIsDetailModalOpen(false)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <RefreshCw size={18} />
                  Request Re-evaluation
                </button>
              )}
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

export default GradingResults
