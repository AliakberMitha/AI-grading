import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Users,
  Building2,
  School,
  BookOpen,
  FileText,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  TrendingUp
} from 'lucide-react'

const StatCard = ({ icon: Icon, label, value, color, trend }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {trend && (
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <TrendingUp size={12} />
            {trend}
          </p>
        )}
      </div>
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  </div>
)

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBranches: 0,
    totalClasses: 0,
    totalSubjects: 0,
    totalStudents: 0,
    totalAnswerSheets: 0,
    pendingGrading: 0,
    completedGrading: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [
        { count: usersCount },
        { count: branchesCount },
        { count: classesCount },
        { count: subjectsCount },
        { count: studentsCount },
        { count: totalSheets },
        { count: pendingSheets },
        { count: completedSheets }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('branches').select('*', { count: 'exact', head: true }),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('subjects').select('*', { count: 'exact', head: true }),
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('answer_sheets').select('*', { count: 'exact', head: true }),
        supabase.from('answer_sheets').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('answer_sheets').select('*', { count: 'exact', head: true }).eq('status', 'graded')
      ])

      setStats({
        totalUsers: usersCount || 0,
        totalBranches: branchesCount || 0,
        totalClasses: classesCount || 0,
        totalSubjects: subjectsCount || 0,
        totalStudents: studentsCount || 0,
        totalAnswerSheets: totalSheets || 0,
        pendingGrading: pendingSheets || 0,
        completedGrading: completedSheets || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
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
        <h2 className="text-2xl font-bold mb-2">Welcome to Admin Dashboard</h2>
        <p className="text-blue-100">
          Manage your AI Grading System - Users, Classes, Subjects, and more.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats.totalUsers}
          color="bg-blue-500"
        />
        <StatCard
          icon={Building2}
          label="Branches"
          value={stats.totalBranches}
          color="bg-purple-500"
        />
        <StatCard
          icon={School}
          label="Classes"
          value={stats.totalClasses}
          color="bg-green-500"
        />
        <StatCard
          icon={BookOpen}
          label="Subjects"
          value={stats.totalSubjects}
          color="bg-orange-500"
        />
      </div>

      {/* Grading Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="Total Answer Sheets"
          value={stats.totalAnswerSheets}
          color="bg-indigo-500"
        />
        <StatCard
          icon={Clock}
          label="Pending Grading"
          value={stats.pendingGrading}
          color="bg-yellow-500"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={stats.completedGrading}
          color="bg-emerald-500"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Total Students"
          value={stats.totalStudents}
          color="bg-pink-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <a
            href="/admin/users"
            className="p-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-center transition-colors"
          >
            <Users size={24} className="mx-auto mb-2 text-blue-600" />
            <p className="text-sm font-medium text-gray-700">Add User</p>
          </a>
          <a
            href="/admin/question-papers"
            className="p-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-center transition-colors"
          >
            <FileText size={24} className="mx-auto mb-2 text-green-600" />
            <p className="text-sm font-medium text-gray-700">Upload Question Paper</p>
          </a>
          <a
            href="/admin/students"
            className="p-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-center transition-colors"
          >
            <ClipboardCheck size={24} className="mx-auto mb-2 text-purple-600" />
            <p className="text-sm font-medium text-gray-700">Manage Students</p>
          </a>
          <a
            href="/admin/reports"
            className="p-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-center transition-colors"
          >
            <TrendingUp size={24} className="mx-auto mb-2 text-orange-600" />
            <p className="text-sm font-medium text-gray-700">View Reports</p>
          </a>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
