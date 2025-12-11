import { useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/common/Sidebar'
import Header from '../components/common/Header'

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const pageTitle = useMemo(() => {
    const titles = {
      '/admin': 'Admin Dashboard',
      '/admin/users': 'User Management',
      '/admin/branches': 'Branch Management',
      '/admin/classes': 'Class Management',
      '/admin/subjects': 'Subject Management',
      '/admin/academic-levels': 'Academic Levels',
      '/admin/weightage': 'Weightage Settings',
      '/admin/strictness': 'Strictness Settings',
      '/admin/assignments': 'User Assignments',
      '/admin/question-papers': 'Question Papers',
      '/admin/students': 'Student Master',
      '/admin/permissions': 'Page Permissions',
      '/admin/reports': 'Reports & Insights',
      '/admin/answer-sheets': 'Answer Sheet Management',
      '/admin/re-evaluation-logs': 'Re-evaluation History'
    }

    return titles[location.pathname] || 'Admin Dashboard'
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:ml-64">
        <Header 
          onMenuClick={() => setSidebarOpen(true)} 
          title={pageTitle}
        />
        
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
