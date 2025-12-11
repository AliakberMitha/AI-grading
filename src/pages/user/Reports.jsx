import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  FileText,
  Clock,
  CheckCircle2,
  TrendingUp,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  Users,
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

const Reports = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUploads: 0,
    pending: 0,
    graded: 0,
    avgScore: 0,
    highestScore: 0,
    lowestScore: 0
  })
  const [classSummary, setClassSummary] = useState([])
  const [subjectSummary, setSubjectSummary] = useState([])
  const [classWiseBreakdown, setClassWiseBreakdown] = useState([])
  const [recentSheets, setRecentSheets] = useState([])
  const [dateRange, setDateRange] = useState('all') // 'week', 'month', 'all'

  useEffect(() => {
    if (user) {
      fetchReportData()
    }
  }, [user, dateRange])

  const getDateFilter = () => {
    const now = new Date()
    if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return weekAgo.toISOString()
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return monthAgo.toISOString()
    }
    return null
  }

  const fetchReportData = async () => {
    try {
      setLoading(true)

      // First, get all user assignments to know which classes are assigned to this user
      const { data: assignments, error: assignError } = await supabase
        .from('user_assignments')
        .select(`
          class_id,
          subject_id,
          classes (id, name),
          subjects (id, name)
        `)
        .eq('user_id', user.id)

      if (assignError) throw assignError

      // Get total students for each assigned class
      const assignedClassIds = [...new Set(assignments?.map(a => a.class_id) || [])]
      
      let studentCounts = {}
      if (assignedClassIds.length > 0) {
        const { data: students, error: studentError } = await supabase
          .from('students')
          .select('id, class_id')
          .in('class_id', assignedClassIds)

        if (!studentError && students) {
          students.forEach(s => {
            studentCounts[s.class_id] = (studentCounts[s.class_id] || 0) + 1
          })
        }
      }

      let query = supabase
        .from('answer_sheets')
        .select(`
          *,
          classes (id, name),
          subjects (id, name),
          students (id, name, roll_number),
          question_papers (id, title, total_marks)
        `)
        .eq('graded_by', user.id)

      const dateFilter = getDateFilter()
      if (dateFilter) {
        query = query.gte('created_at', dateFilter)
      }

      const { data: sheets, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      const allSheets = sheets || []
      const gradedSheets = allSheets.filter(s => s.status === 'graded' && s.total_score !== null)

      // Calculate stats
      const pending = allSheets.filter(s => s.status === 'pending' || s.status === 'processing').length
      const graded = gradedSheets.length
      
      const avgScore = gradedSheets.length > 0
        ? gradedSheets.reduce((sum, s) => sum + (s.total_score || 0), 0) / gradedSheets.length
        : 0
      
      const scores = gradedSheets.map(s => s.total_score || 0)
      const highestScore = scores.length > 0 ? Math.max(...scores) : 0
      const lowestScore = scores.length > 0 ? Math.min(...scores) : 0

      setStats({
        totalUploads: allSheets.length,
        pending,
        graded,
        avgScore,
        highestScore,
        lowestScore
      })

      // Class-wise breakdown with total students, completed, pending
      const classBreakdown = {}
      
      // Initialize with all assigned classes
      assignments?.forEach(a => {
        const key = `${a.class_id}-${a.subject_id}`
        if (!classBreakdown[key]) {
          classBreakdown[key] = {
            className: a.classes?.name || 'Unknown',
            subjectName: a.subjects?.name || 'Unknown',
            classId: a.class_id,
            subjectId: a.subject_id,
            totalStudents: studentCounts[a.class_id] || 0,
            completed: 0,
            pending: 0,
            avgScore: 0,
            totalScore: 0
          }
        }
      })

      // Count completed and pending per class-subject
      allSheets.forEach(sheet => {
        const key = `${sheet.class_id}-${sheet.subject_id}`
        if (classBreakdown[key]) {
          if (sheet.status === 'graded') {
            classBreakdown[key].completed++
            if (sheet.total_score !== null) {
              classBreakdown[key].totalScore += sheet.total_score
            }
          } else if (sheet.status === 'pending' || sheet.status === 'processing') {
            classBreakdown[key].pending++
          }
        }
      })

      // Calculate avg scores and pending students
      const breakdownData = Object.values(classBreakdown).map(c => ({
        ...c,
        avgScore: c.completed > 0 ? c.totalScore / c.completed : 0,
        remainingStudents: Math.max(0, c.totalStudents - c.completed - c.pending)
      }))
      
      setClassWiseBreakdown(breakdownData.sort((a, b) => a.className.localeCompare(b.className)))

      // Class summary (for uploads only)
      const classMap = {}
      allSheets.forEach(sheet => {
        const className = sheet.classes?.name || 'Unknown'
        if (!classMap[className]) {
          classMap[className] = { name: className, total: 0, graded: 0, avgScore: 0, totalScore: 0 }
        }
        classMap[className].total++
        if (sheet.status === 'graded' && sheet.total_score !== null) {
          classMap[className].graded++
          classMap[className].totalScore += sheet.total_score
        }
      })
      
      const classData = Object.values(classMap).map(c => ({
        ...c,
        avgScore: c.graded > 0 ? c.totalScore / c.graded : 0
      }))
      setClassSummary(classData.sort((a, b) => b.total - a.total))

      // Subject summary
      const subjectMap = {}
      allSheets.forEach(sheet => {
        const subjectName = sheet.subjects?.name || 'Unknown'
        if (!subjectMap[subjectName]) {
          subjectMap[subjectName] = { name: subjectName, total: 0, graded: 0, avgScore: 0, totalScore: 0 }
        }
        subjectMap[subjectName].total++
        if (sheet.status === 'graded' && sheet.total_score !== null) {
          subjectMap[subjectName].graded++
          subjectMap[subjectName].totalScore += sheet.total_score
        }
      })
      
      const subjectData = Object.values(subjectMap).map(s => ({
        ...s,
        avgScore: s.graded > 0 ? s.totalScore / s.graded : 0
      }))
      setSubjectSummary(subjectData.sort((a, b) => b.total - a.total))

      // Recent sheets (last 10)
      setRecentSheets(allSheets.slice(0, 10))

    } catch (error) {
      toast.error('Failed to load report data')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    try {
      // Prepare data
      const headers = ['Roll/Magic No.', 'Class', 'Subject', 'Question Paper', 'Status', 'Score', 'Grade', 'Date']
      const rows = recentSheets.map(sheet => [
        sheet.extracted_roll_number || sheet.manual_roll_number || sheet.students?.roll_number || '',
        sheet.classes?.name || '',
        sheet.subjects?.name || '',
        sheet.question_papers?.title || '',
        sheet.status,
        sheet.total_score?.toFixed(1) || '',
        sheet.grade || '',
        new Date(sheet.created_at).toLocaleDateString()
      ])

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `grading_report_${new Date().toISOString().split('T')[0]}.csv`
      link.click()

      toast.success('Report exported successfully!')
    } catch (error) {
      toast.error('Export failed')
      console.error(error)
    }
  }

  const getGradeBadge = (grade) => {
    if (!grade) return null
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
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors[grade] || 'bg-gray-100 text-gray-700'}`}>
        {grade}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Status Reports</h1>
          <p className="text-gray-500">Overview of your grading activity and performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="month">Last 30 Days</option>
            <option value="week">Last 7 Days</option>
          </select>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <FileText size={20} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.totalUploads}</p>
          <p className="text-sm text-gray-500">Total Uploads</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock size={20} className="text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-sm text-gray-500">Pending</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 size={20} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.graded}</p>
          <p className="text-sm text-gray-500">Completed</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 size={20} className="text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-indigo-600">{stats.avgScore.toFixed(1)}</p>
          <p className="text-sm text-gray-500">Avg Score</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp size={20} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats.highestScore.toFixed(1)}</p>
          <p className="text-sm text-gray-500">Highest</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp size={20} className="text-red-500 rotate-180" />
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.lowestScore.toFixed(1)}</p>
          <p className="text-sm text-gray-500">Lowest</p>
        </div>
      </div>

      {/* Class-wise Breakdown with Student Counts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-800">Class-wise Student Progress</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">Total students vs. graded answer sheets for your assigned classes</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Class</th>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-center">Total Students</th>
                <th className="px-4 py-3 text-center">Completed</th>
                <th className="px-4 py-3 text-center">In Progress</th>
                <th className="px-4 py-3 text-center">Remaining</th>
                <th className="px-4 py-3 text-center">Avg Score</th>
                <th className="px-4 py-3 text-center">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {classWiseBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                    No class assignments found
                  </td>
                </tr>
              ) : (
                classWiseBreakdown.map((item, index) => {
                  const progressPercent = item.totalStudents > 0 
                    ? Math.round((item.completed / item.totalStudents) * 100) 
                    : 0
                  return (
                    <tr key={index}>
                      <td className="px-4 py-3 font-medium text-gray-800">{item.className}</td>
                      <td className="px-4 py-3 text-gray-600">{item.subjectName}</td>
                      <td className="px-4 py-3 text-center font-bold text-gray-800">{item.totalStudents}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                          <CheckCircle2 size={14} />
                          {item.completed}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                          <Clock size={14} />
                          {item.pending}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 font-medium ${
                          item.remainingStudents > 0 ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {item.remainingStudents > 0 && <AlertCircle size={14} />}
                          {item.remainingStudents}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-indigo-600 font-medium">
                        {item.avgScore.toFixed(1)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                progressPercent >= 100 ? 'bg-green-500' :
                                progressPercent >= 50 ? 'bg-blue-500' :
                                progressPercent > 0 ? 'bg-yellow-500' : 'bg-gray-300'
                              }`}
                              style={{ width: `${Math.min(100, progressPercent)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-gray-600 w-10">{progressPercent}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <PieChart size={20} className="text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-800">Uploads By Class</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Class</th>
                  <th className="px-4 py-3 text-left">Total</th>
                  <th className="px-4 py-3 text-left">Graded</th>
                  <th className="px-4 py-3 text-left">Avg Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {classSummary.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                      No data yet
                    </td>
                  </tr>
                ) : (
                  classSummary.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                      <td className="px-4 py-3 text-gray-600">{item.total}</td>
                      <td className="px-4 py-3 text-green-600">{item.graded}</td>
                      <td className="px-4 py-3 text-blue-600 font-medium">{item.avgScore.toFixed(1)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Subject Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-800">By Subject</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-left">Total</th>
                  <th className="px-4 py-3 text-left">Graded</th>
                  <th className="px-4 py-3 text-left">Avg Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subjectSummary.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                      No data yet
                    </td>
                  </tr>
                ) : (
                  subjectSummary.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                      <td className="px-4 py-3 text-gray-600">{item.total}</td>
                      <td className="px-4 py-3 text-green-600">{item.graded}</td>
                      <td className="px-4 py-3 text-purple-600 font-medium">{item.avgScore.toFixed(1)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-800">Recent Activity</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Roll / Magic No.</th>
                <th className="px-4 py-3 text-left">Class / Subject</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Score</th>
                <th className="px-4 py-3 text-left">Grade</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentSheets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    No answer sheets uploaded yet
                  </td>
                </tr>
              ) : (
                recentSheets.map((sheet) => (
                  <tr key={sheet.id}>
                    <td className="px-4 py-3">
                      {sheet.extracted_roll_number ? (
                        <>
                          <p className="font-medium text-indigo-700">{sheet.extracted_roll_number}</p>
                          <p className="text-xs text-gray-500">AI Extracted</p>
                        </>
                      ) : sheet.manual_roll_number ? (
                        <>
                          <p className="font-medium text-gray-800">{sheet.manual_roll_number}</p>
                          <p className="text-xs text-gray-500">Manual</p>
                        </>
                      ) : (
                        <p className="text-gray-400">Not identified</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{sheet.classes?.name}</p>
                      <p className="text-xs text-gray-500">{sheet.subjects?.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        sheet.status === 'graded' ? 'bg-green-100 text-green-700' :
                        sheet.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        sheet.status === 'error' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {sheet.status.charAt(0).toUpperCase() + sheet.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {sheet.total_score?.toFixed(1) || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {getGradeBadge(sheet.grade) || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(sheet.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Reports
