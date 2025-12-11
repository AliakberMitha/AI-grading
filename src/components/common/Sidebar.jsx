import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard,
  Users,
  School,
  BookOpen,
  Building2,
  GraduationCap,
  Scale,
  Gauge,
  UserCog,
  FileText,
  Upload,
  BarChart3,
  ClipboardList,
  Shield,
  LogOut,
  X,
  FileCheck,
  History
} from 'lucide-react'

const Sidebar = ({ isOpen, onClose }) => {
  const { isAdmin, signOut, userProfile } = useAuth()

  const adminMenuItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/admin/users', icon: Users, label: 'User Management' },
    { path: '/admin/branches', icon: Building2, label: 'Branches' },
    { path: '/admin/classes', icon: School, label: 'Classes' },
    { path: '/admin/subjects', icon: BookOpen, label: 'Subjects' },
    { path: '/admin/academic-levels', icon: GraduationCap, label: 'Academic Levels' },
    { path: '/admin/weightage', icon: Scale, label: 'Weightage & Max Marks' },
    { path: '/admin/strictness', icon: Gauge, label: 'Strictness Settings' },
    { path: '/admin/assignments', icon: UserCog, label: 'User Assignments' },
    { path: '/admin/question-papers', icon: FileText, label: 'Question Papers' },
    { path: '/admin/students', icon: ClipboardList, label: 'Student Master' },
    { path: '/admin/answer-sheets', icon: FileCheck, label: 'Answer Sheets' },
    { path: '/admin/re-evaluation-logs', icon: History, label: 'Re-evaluation Logs' },
    { path: '/admin/permissions', icon: Shield, label: 'Page Permissions' },
    { path: '/admin/reports', icon: BarChart3, label: 'Reports' },
  ]

  const userMenuItems = [
    { path: '/user', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/user/upload', icon: Upload, label: 'Upload Answer Sheets' },
    { path: '/user/results', icon: ClipboardList, label: 'Grading Results' },
    { path: '/user/reports', icon: BarChart3, label: 'Status Reports' },
  ]

  const menuItems = isAdmin ? adminMenuItems : userMenuItems

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg">AI Grading</h1>
              <p className="text-xs text-gray-400">{isAdmin ? 'Admin Panel' : 'User Panel'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 hover:bg-gray-700 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-700">
          <p className="text-sm text-gray-400">Welcome,</p>
          <p className="font-medium truncate">{userProfile?.itsid || 'User'}</p>
          <p className="text-xs text-gray-500 truncate">{userProfile?.branches?.name || 'No Branch'}</p>
        </div>

        {/* Navigation */}
        <nav className="p-4 overflow-y-auto h-[calc(100vh-220px)]">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.exact}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`
                  }
                >
                  <item.icon size={20} />
                  <span className="text-sm">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sign Out */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-gray-300 hover:bg-red-600 hover:text-white rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
