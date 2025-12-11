import { useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/common/Sidebar'
import Header from '../components/common/Header'

const UserLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const pageTitle = useMemo(() => {
    const titles = {
      '/user': 'User Dashboard',
      '/user/upload': 'Upload Answer Sheets',
      '/user/results': 'Grading Results',
      '/user/reports': 'Status Reports'
    }
    return titles[location.pathname] || 'User Dashboard'
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

export default UserLayout
