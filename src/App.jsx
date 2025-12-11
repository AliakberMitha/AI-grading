import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import GeminiApiTest from './components/common/GeminiApiTest'

// Layouts
import AdminLayout from './layouts/AdminLayout'
import UserLayout from './layouts/UserLayout'

// Pages
import Login from './pages/Login'
import AdminDashboard from './pages/admin/Dashboard'
import BranchManagement from './pages/admin/BranchManagement'
import ClassManagement from './pages/admin/ClassManagement'
import SubjectManagement from './pages/admin/SubjectManagement'
import UserManagement from './pages/admin/UserManagement'
import AcademicLevelManagement from './pages/admin/AcademicLevelManagement'
import WeightageSettings from './pages/admin/WeightageSettings'
import StrictnessSettings from './pages/admin/StrictnessSettings'
import UserAssignments from './pages/admin/UserAssignments'
import QuestionPaperManagement from './pages/admin/QuestionPaperManagement'
import StudentManagement from './pages/admin/StudentManagement'
import PagePermissions from './pages/admin/PagePermissions'
import Reports from './pages/admin/Reports'
import AnswerSheetManagement from './pages/admin/AnswerSheetManagement'
import ReevaluationLogs from './pages/admin/ReevaluationLogs'
import UserDashboard from './pages/user/Dashboard'
import UploadAnswerSheet from './pages/user/UploadAnswerSheet'
import GradingResults from './pages/user/GradingResults'
import UserReports from './pages/user/Reports'

// Protected Route Component
const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, userProfile, loading, authError, refreshSession } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 gap-4">
        <p className="text-red-500">Authentication error: {authError}</p>
        <button 
          onClick={refreshSession}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRole && userProfile?.role !== allowedRole) {
    return <Navigate to={userProfile?.role === 'admin' ? '/admin' : '/user'} replace />
  }

  return children
}

// Auth Route - redirects logged in users
const AuthRoute = ({ children }) => {
  const { user, userProfile, loading, authError, refreshSession } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 gap-4">
        <p className="text-red-500">Authentication error: {authError}</p>
        <button 
          onClick={refreshSession}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (user && userProfile) {
    return <Navigate to={userProfile.role === 'admin' ? '/admin' : '/user'} replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <AuthRoute>
            <Login />
          </AuthRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="branches" element={<BranchManagement />} />
        <Route path="classes" element={<ClassManagement />} />
        <Route path="subjects" element={<SubjectManagement />} />
        <Route path="academic-levels" element={<AcademicLevelManagement />} />
        <Route path="weightage" element={<WeightageSettings />} />
        <Route path="strictness" element={<StrictnessSettings />} />
        <Route path="assignments" element={<UserAssignments />} />
        <Route path="question-papers" element={<QuestionPaperManagement />} />
        <Route path="students" element={<StudentManagement />} />
        <Route path="permissions" element={<PagePermissions />} />
        <Route path="reports" element={<Reports />} />
        <Route path="answer-sheets" element={<AnswerSheetManagement />} />
        <Route path="re-evaluation-logs" element={<ReevaluationLogs />} />
      </Route>

      {/* User Routes */}
      <Route
        path="/user"
        element={
          <ProtectedRoute allowedRole="user">
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<UserDashboard />} />
        <Route path="upload" element={<UploadAnswerSheet />} />
        <Route path="results" element={<GradingResults />} />
        <Route path="reports" element={<UserReports />} />
      </Route>

      {/* Default Redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#333',
              color: '#fff',
            },
            success: {
              style: {
                background: '#10B981',
              },
            },
            error: {
              style: {
                background: '#EF4444',
              },
            },
          }}
        />
        <GeminiApiTest />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App