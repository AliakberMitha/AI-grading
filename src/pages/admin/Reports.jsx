import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { FileText, Clock, CheckCircle2, Users, ClipboardList, Download, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const Reports = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSheets: 0,
    pending: 0,
    graded: 0,
    users: 0,
    students: 0
  })
  const [classSummary, setClassSummary] = useState([])
  const [subjectSummary, setSubjectSummary] = useState([])
  const [branchSummary, setBranchSummary] = useState([])
  const [allAnswerSheets, setAllAnswerSheets] = useState([])

  useEffect(() => {
    fetchReportData()
  }, [])

  const fetchReportData = async () => {
    try {
      setLoading(true)
      const [answerSheetRes, detailedSheetRes, classRes, subjectRes, branchRes, studentRes, userRes] = await Promise.all([
        supabase.from('answer_sheets').select('id, status, class_id, subject_id'),
        supabase.from('answer_sheets').select(`
          *,
          students (id, name, roll_number),
          classes (id, name),
          subjects (id, name),
          question_papers (id, title, total_marks),
          users:graded_by (id, itsid)
        `).order('created_at', { ascending: false }).limit(500),
        supabase.from('classes').select('id, name'),
        supabase.from('subjects').select('id, name'),
        supabase.from('branches').select('id, name'),
        supabase.from('students').select('id, branch_id, class_id'),
        supabase.from('users').select('id')
      ])

      if (answerSheetRes.error) throw answerSheetRes.error
      if (classRes.error) throw classRes.error
      if (subjectRes.error) throw subjectRes.error
      if (branchRes.error) throw branchRes.error
      if (studentRes.error) throw studentRes.error
      if (userRes.error) throw userRes.error

      const sheets = answerSheetRes.data || []
      const classes = classRes.data || []
      const subjects = subjectRes.data || []
      const branches = branchRes.data || []
      const students = studentRes.data || []
      const users = userRes.data || []

      setAllAnswerSheets(detailedSheetRes.data || [])

      const pending = sheets.filter((sheet) => sheet.status === 'pending').length
      const graded = sheets.filter((sheet) => sheet.status === 'graded').length

      setStats({
        totalSheets: sheets.length,
        pending,
        graded,
        users: users.length,
        students: students.length
      })

      const classLookup = classes.reduce((acc, item) => {
        acc[item.id] = item.name
        return acc
      }, {})

      const subjectLookup = subjects.reduce((acc, item) => {
        acc[item.id] = item.name
        return acc
      }, {})

      const classAggregates = sheets.reduce((acc, sheet) => {
        if (!sheet.class_id) return acc
        if (!acc[sheet.class_id]) {
          acc[sheet.class_id] = { id: sheet.class_id, pending: 0, graded: 0, total: 0 }
        }
        acc[sheet.class_id].total += 1
        if (sheet.status === 'graded') {
          acc[sheet.class_id].graded += 1
        } else {
          acc[sheet.class_id].pending += 1
        }
        return acc
      }, {})

      const subjectAggregates = sheets.reduce((acc, sheet) => {
        if (!sheet.subject_id) return acc
        if (!acc[sheet.subject_id]) {
          acc[sheet.subject_id] = { id: sheet.subject_id, pending: 0, graded: 0, total: 0 }
        }
        acc[sheet.subject_id].total += 1
        if (sheet.status === 'graded') {
          acc[sheet.subject_id].graded += 1
        } else {
          acc[sheet.subject_id].pending += 1
        }
        return acc
      }, {})

      const branchAggregates = students.reduce((acc, student) => {
        if (!student.branch_id) return acc
        if (!acc[student.branch_id]) {
          acc[student.branch_id] = { id: student.branch_id, students: 0 }
        }
        acc[student.branch_id].students += 1
        return acc
      }, {})

      setClassSummary(
        Object.values(classAggregates)
          .map((item) => ({
            ...item,
            name: classLookup[item.id] || 'Unknown'
          }))
          .sort((a, b) => b.total - a.total)
      )

      setSubjectSummary(
        Object.values(subjectAggregates)
          .map((item) => ({
            ...item,
            name: subjectLookup[item.id] || 'Unknown'
          }))
          .sort((a, b) => b.total - a.total)
      )

      setBranchSummary(
        Object.values(branchAggregates)
          .map((item) => ({
            ...item,
            name: branches.find((branch) => branch.id === item.id)?.name || 'Unknown'
          }))
          .sort((a, b) => b.students - a.students)
      )
    } catch (error) {
      toast.error('Unable to load reports')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    try {
      const headers = ['Student', 'Roll Number', 'Class', 'Subject', 'Question Paper', 'Grader', 'Status', 'Content Score', 'Language Score', 'Total Score', 'Grade', 'Date']
      const rows = allAnswerSheets.map(sheet => [
        sheet.students?.name || '',
        sheet.students?.roll_number || '',
        sheet.classes?.name || '',
        sheet.subjects?.name || '',
        sheet.question_papers?.title || '',
        sheet.users?.itsid || '',
        sheet.status,
        sheet.content_score?.toFixed(1) || '',
        sheet.language_score?.toFixed(1) || '',
        sheet.total_score?.toFixed(1) || '',
        sheet.grade || '',
        new Date(sheet.created_at).toLocaleDateString()
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `admin_grading_report_${new Date().toISOString().split('T')[0]}.csv`
      link.click()

      toast.success('Report exported successfully!')
    } catch (error) {
      toast.error('Export failed')
      console.error(error)
    }
  }

  const exportSummaryToCSV = () => {
    try {
      // Class summary
      let csvContent = 'CLASS SUMMARY\nClass,Pending,Graded,Total\n'
      classSummary.forEach(item => {
        csvContent += `"${item.name}",${item.pending},${item.graded},${item.total}\n`
      })

      csvContent += '\nSUBJECT SUMMARY\nSubject,Pending,Graded,Total\n'
      subjectSummary.forEach(item => {
        csvContent += `"${item.name}",${item.pending},${item.graded},${item.total}\n`
      })

      csvContent += '\nBRANCH SUMMARY\nBranch,Students\n'
      branchSummary.forEach(item => {
        csvContent += `"${item.name}",${item.students}\n`
      })

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `summary_report_${new Date().toISOString().split('T')[0]}.csv`
      link.click()

      toast.success('Summary exported successfully!')
    } catch (error) {
      toast.error('Export failed')
      console.error(error)
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports & Insights</h1>
          <p className="text-gray-500">Understand grading throughput across branches, classes, and subjects.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchReportData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
          <button
            onClick={exportSummaryToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download size={18} />
            Summary
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download size={18} />
            Full Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Answer Sheets</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalSheets}</p>
            </div>
            <FileText size={28} className="text-blue-500" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Grading</p>
              <p className="text-2xl font-bold text-gray-800">{stats.pending}</p>
            </div>
            <Clock size={28} className="text-yellow-500" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-800">{stats.graded}</p>
            </div>
            <CheckCircle2 size={28} className="text-green-500" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Users</p>
              <p className="text-2xl font-bold text-gray-800">{stats.users}</p>
            </div>
            <Users size={28} className="text-indigo-500" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Class Level Progress</h2>
          <p className="text-sm text-gray-500">Pending vs completed grading per class</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Class</th>
                <th className="px-6 py-3 text-left">Pending</th>
                <th className="px-6 py-3 text-left">Graded</th>
                <th className="px-6 py-3 text-left">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {classSummary.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-gray-500">
                    No grading activity yet
                  </td>
                </tr>
              )}
              {classSummary.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-3 font-medium text-gray-800">{item.name}</td>
                  <td className="px-6 py-3 text-yellow-600">{item.pending}</td>
                  <td className="px-6 py-3 text-green-600">{item.graded}</td>
                  <td className="px-6 py-3 text-gray-700">{item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Subject Overview</h2>
            <p className="text-sm text-gray-500">AI workload by subject</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 text-left">Subject</th>
                  <th className="px-6 py-3 text-left">Pending</th>
                  <th className="px-6 py-3 text-left">Graded</th>
                  <th className="px-6 py-3 text-left">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subjectSummary.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-6 text-center text-gray-500">
                      No subject data yet
                    </td>
                  </tr>
                )}
                {subjectSummary.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-3 font-medium text-gray-800">{item.name}</td>
                    <td className="px-6 py-3 text-yellow-600">{item.pending}</td>
                    <td className="px-6 py-3 text-green-600">{item.graded}</td>
                    <td className="px-6 py-3 text-gray-700">{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Branch Roster</h2>
            <p className="text-sm text-gray-500">Student count per branch</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 text-left">Branch</th>
                  <th className="px-6 py-3 text-left">Students</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {branchSummary.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-6 py-6 text-center text-gray-500">
                      No branch data yet
                    </td>
                  </tr>
                )}
                {branchSummary.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-3 font-medium text-gray-800">{item.name}</td>
                    <td className="px-6 py-3 flex items-center gap-2 text-gray-700">
                      <ClipboardList size={16} className="text-blue-500" />
                      {item.students}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reports
