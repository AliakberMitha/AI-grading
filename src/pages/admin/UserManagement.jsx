import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Table from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import { Plus, Pencil, Trash2, Users, Search, Eye, EyeOff, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

const UserManagement = () => {
  const [users, setUsers] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    itsid: '',
    email: '',
    password: '',
    role: 'user',
    branch_id: '',
    is_active: true
  })

  useEffect(() => {
    fetchUsers()
    fetchBranches()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          branches (id, name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      toast.error('Failed to fetch users')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name')

      if (error) throw error
      setBranches(data || [])
    } catch (error) {
      console.error('Failed to fetch branches:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.itsid.trim() || !formData.email.trim()) {
      toast.error('ITSID and Email are required')
      return
    }

    if (!editingUser && !formData.password) {
      toast.error('Password is required for new users')
      return
    }

    try {
      if (editingUser) {
        // Update existing user
        const { error } = await supabase
          .from('users')
          .update({
            itsid: formData.itsid,
            email: formData.email,
            role: formData.role,
            branch_id: formData.branch_id || null,
            is_active: formData.is_active
          })
          .eq('id', editingUser.id)

        if (error) throw error
        toast.success('User updated successfully')
      } else {
        // Store current session before creating new user
        const { data: currentSession } = await supabase.auth.getSession()
        
        // Create new user via Supabase Auth
        // Note: signUp with autoConfirm will create but NOT sign in when email confirmation is disabled
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              itsid: formData.itsid
            },
            emailRedirectTo: undefined
          }
        })

        if (authError) {
          // Handle user_already_exists - try to find and link them
          if (authError.message?.includes('already') || authError.code === 'user_already_exists') {
            toast.error('This email is already registered in authentication. Please use a different email or contact support to link the existing account.')
            return
          }
          throw authError
        }

        if (!authData?.user?.id) {
          throw new Error('Failed to create user - no user ID returned')
        }

        // Create user profile using upsert to handle edge cases
        const { error: profileError } = await supabase
          .from('users')
          .upsert([{
            id: authData.user.id,
            itsid: formData.itsid,
            email: formData.email,
            role: formData.role,
            branch_id: formData.branch_id || null,
            is_active: formData.is_active
          }], { onConflict: 'id' })

        if (profileError) {
          console.error('Profile creation error:', profileError)
          toast.error(`User auth created but profile failed: ${profileError.message}. Please run the RLS fix SQL in Supabase.`)
          return
        }
        
        // Restore admin session if it was changed
        if (currentSession?.session) {
          await supabase.auth.setSession(currentSession.session)
        }
        
        toast.success('User created successfully')
      }

      setIsModalOpen(false)
      resetForm()
      fetchUsers()
    } catch (error) {
      toast.error(error.message || 'Operation failed')
      console.error(error)
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      itsid: user.itsid,
      email: user.email,
      password: '',
      role: user.role,
      branch_id: user.branch_id || '',
      is_active: user.is_active
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.itsid}"?`)) {
      return
    }

    try {
      // Delete from users table (auth user will cascade)
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)

      if (error) throw error
      toast.success('User deleted successfully')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to delete user')
      console.error(error)
    }
  }

  const toggleUserStatus = async (user) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !user.is_active })
        .eq('id', user.id)

      if (error) throw error
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'} successfully`)
      fetchUsers()
    } catch (error) {
      toast.error('Failed to update user status')
      console.error(error)
    }
  }

  const resetForm = () => {
    setFormData({
      itsid: '',
      email: '',
      password: '',
      role: 'user',
      branch_id: '',
      is_active: true
    })
    setEditingUser(null)
    setShowPassword(false)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const filteredUsers = users.filter(user =>
    user.itsid.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.branches?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns = [
    {
      header: 'User',
      accessor: 'itsid',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            row.role === 'admin' ? 'bg-purple-100' : 'bg-blue-100'
          }`}>
            <Users size={20} className={row.role === 'admin' ? 'text-purple-600' : 'text-blue-600'} />
          </div>
          <div>
            <p className="font-medium text-gray-800">{row.itsid}</p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Role',
      accessor: 'role',
      render: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          row.role === 'admin' 
            ? 'bg-purple-100 text-purple-700' 
            : 'bg-blue-100 text-blue-700'
        }`}>
          {row.role.charAt(0).toUpperCase() + row.role.slice(1)}
        </span>
      )
    },
    {
      header: 'Branch',
      accessor: 'branches',
      render: (row) => (
        <span className="text-gray-600">{row.branches?.name || '-'}</span>
      )
    },
    {
      header: 'Status',
      accessor: 'is_active',
      render: (row) => (
        <button
          onClick={() => toggleUserStatus(row)}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
            row.is_active 
              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
        >
          {row.is_active ? <Check size={12} /> : <X size={12} />}
          {row.is_active ? 'Active' : 'Inactive'}
        </button>
      )
    },
    {
      header: 'Created',
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <p className="text-gray-500">Manage system users and their access</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add User
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredUsers}
        loading={loading}
        emptyMessage="No users found"
        actions={(row) => (
          <>
            <button
              onClick={() => handleEdit(row)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => handleDelete(row)}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit User' : 'Add New User'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ITS ID *
            </label>
            <input
              type="text"
              value={formData.itsid}
              onChange={(e) => setFormData({ ...formData, itsid: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter ITS ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter email address"
            />
          </div>

          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch
              </label>
              <select
                value={formData.branch_id}
                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Branch</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              Active user
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingUser ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default UserManagement
