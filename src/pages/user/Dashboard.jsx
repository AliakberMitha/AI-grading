import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Upload,
  FileText,
  Clock,
  CheckCircle2,
  Users,
  BookOpen,
  ArrowRight
} from 'lucide-react'

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  </div>
)

const Dashboard = () => {
  const { user, userProfile } = useAuth()
  const [stats, setStats] = useState({
    assignedClasses: 0,
    assignedSubjects: 0,
    totalStudents: 0,
    pendingSheets: 0,
    completedSheets: 0,
    remainingStudents: 0
  })
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      // Fetch user assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('user_assignments')
        .select(`
          *,
          classes (id, name),
          subjects (id, name)
        `)
        .eq('user_id', user.id)

      if (assignmentsError) throw assignmentsError

      // Get unique classes and subjects
      const uniqueClasses = [...new Set(assignmentsData?.map(a => a.class_id) || [])]
      const uniqueSubjects = [...new Set(assignmentsData?.map(a => a.subject_id) || [])]

      // Fetch answer sheets stats
      const { count: pendingCount } = await supabase
        .from('answer_sheets')
        .select('*', { count: 'exact', head: true })
        .eq('graded_by', user.id)
        .in('status', ['pending', 'processing'])

      const { count: completedCount } = await supabase
        .from('answer_sheets')
        .select('*', { count: 'exact', head: true })
        .eq('graded_by', user.id)
        .eq('status', 'graded')

      // Fetch student count for assigned classes
      let studentCount = 0
      if (uniqueClasses.length > 0) {
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .in('class_id', uniqueClasses)
        studentCount = count || 0
      }

      // Calculate remaining students (not yet uploaded)
      const remainingStudents = Math.max(0, studentCount - (completedCount || 0) - (pendingCount || 0))

      setAssignments(assignmentsData || [])
      setStats({
        assignedClasses: uniqueClasses.length,
        assignedSubjects: uniqueSubjects.length,
        totalStudents: studentCount,
        pendingSheets: pendingCount || 0,
        completedSheets: completedCount || 0,
        remainingStudents: remainingStudents
      })
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
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
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">
          Welcome, {userProfile?.itsid || 'User'}!
        </h2>
        <p className="text-blue-100">
          Upload and grade answer sheets for your assigned classes and subjects.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard
          icon={BookOpen}
          label="Assigned Classes"
          value={stats.assignedClasses}
          color="bg-blue-500"
        />
        <StatCard
          icon={FileText}
          label="Assigned Subjects"
          value={stats.assignedSubjects}
          color="bg-purple-500"
        />
        <StatCard
          icon={Users}
          label="Total Students"
          value={stats.totalStudents}
          color="bg-indigo-500"
        />
        <StatCard
          icon={Clock}
          label="In Progress"
          value={stats.pendingSheets}
          color="bg-yellow-500"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={stats.completedSheets}
          color="bg-emerald-500"
        />
        <StatCard
          icon={Users}
          label="Remaining"
          value={stats.remainingStudents}
          color="bg-orange-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Card */}
        <Link
          to="/user/upload"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Upload size={24} className="text-blue-600" />
            </div>
            <ArrowRight size={20} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Upload Answer Sheets</h3>
          <p className="text-sm text-gray-500">
            Upload student answer sheets for AI-powered grading and evaluation.
          </p>
        </Link>

        {/* Results Card */}
        <Link
          to="/user/results"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={24} className="text-green-600" />
            </div>
            <ArrowRight size={20} className="text-gray-400 group-hover:text-green-600 transition-colors" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">View Grading Results</h3>
          <p className="text-sm text-gray-500">
            Check grades, remarks, and detailed AI feedback for evaluated sheets.
          </p>
        </Link>
      </div>

      {/* Assigned Classes & Subjects */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Assignments</h3>
        
        {assignments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No classes or subjects assigned yet. Contact your administrator.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="p-4 bg-gray-50 rounded-xl border border-gray-100"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BookOpen size={16} className="text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-800">
                    {assignment.classes?.name}
                  </span>
                </div>
                <p className="text-sm text-gray-500 ml-11">
                  {assignment.subjects?.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
