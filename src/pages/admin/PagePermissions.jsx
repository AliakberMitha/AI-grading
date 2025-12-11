import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import Table from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import { Shield, Plus, Pencil, Trash2, Search, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

const PAGE_OPTIONS = [
  { value: '/admin', label: 'Dashboard' },
  { value: '/admin/users', label: 'User Management' },
  { value: '/admin/branches', label: 'Branches' },
  { value: '/admin/classes', label: 'Classes' },
  { value: '/admin/subjects', label: 'Subjects' },
  { value: '/admin/academic-levels', label: 'Academic Levels' },
  { value: '/admin/weightage', label: 'Weightage & Max Marks' },
  { value: '/admin/strictness', label: 'Strictness Settings' },
  { value: '/admin/assignments', label: 'User Assignments' },
  { value: '/admin/question-papers', label: 'Question Papers' },
  { value: '/admin/students', label: 'Student Master' },
  { value: '/admin/permissions', label: 'Page Permissions' },
  { value: '/admin/reports', label: 'Reports' }
]

const PagePermissions = () => {
  const [permissions, setPermissions] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPermission, setEditingPermission] = useState(null)
  const [formData, setFormData] = useState({
    user_id: '',
    page_name: '',
    can_access: true
  })

  const pageOptionMap = useMemo(() => (
    PAGE_OPTIONS.reduce((acc, option) => {
      acc[option.value] = option.label
      return acc
    }, {})
  ), [])

  useEffect(() => {
    fetchLookups()
    fetchPermissions()
  }, [])

  const fetchLookups = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('itsid')

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      toast.error('Failed to load users')
      console.error(error)
    }
  }

  const fetchPermissions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('page_permissions')
        .select(`
          *,
          users (id, itsid, email)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPermissions(data || [])
    } catch (error) {
      toast.error('Failed to fetch permissions')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ user_id: '', page_name: '', can_access: true })
    setEditingPermission(null)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.user_id || !formData.page_name) {
      toast.error('User and page are required')
      return
    }

    const payload = {
      user_id: formData.user_id,
      page_name: formData.page_name,
      can_access: formData.can_access
    }

    try {
      if (editingPermission) {
        const { error } = await supabase
          .from('page_permissions')
          .update(payload)
          .eq('id', editingPermission.id)

        if (error) throw error
        toast.success('Permission updated')
      } else {
        const { error } = await supabase
          .from('page_permissions')
          .insert([payload])

        if (error) throw error
        toast.success('Permission added')
      }

      setIsModalOpen(false)
      resetForm()
      fetchPermissions()
    } catch (error) {
      toast.error(error.message || 'Operation failed')
      console.error(error)
    }
  }

  const handleEdit = (permission) => {
    setEditingPermission(permission)
    setFormData({
      user_id: permission.user_id,
      page_name: permission.page_name,
      can_access: permission.can_access
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (permission) => {
    if (!window.confirm('Delete this permission?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('page_permissions')
        .delete()
        .eq('id', permission.id)

      if (error) throw error
      toast.success('Permission removed')
      fetchPermissions()
    } catch (error) {
      toast.error('Unable to delete permission')
      console.error(error)
    }
  }

  const toggleAccess = async (permission) => {
    try {
      const { error } = await supabase
        .from('page_permissions')
        .update({ can_access: !permission.can_access })
        .eq('id', permission.id)

      if (error) throw error
      fetchPermissions()
    } catch (error) {
      toast.error('Failed to update access')
      console.error(error)
    }
  }

  const filteredPermissions = permissions.filter((permission) => {
    const userId = permission.users?.itsid?.toLowerCase() || ''
    const email = permission.users?.email?.toLowerCase() || ''
    const pageName = pageOptionMap[permission.page_name]?.toLowerCase() || permission.page_name.toLowerCase()
    const term = searchTerm.toLowerCase()
    return userId.includes(term) || email.includes(term) || pageName.includes(term)
  })

  const columns = [
    {
      header: 'User',
      accessor: 'user',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-800">{row.users?.itsid || 'ITSID'}</p>
          <p className="text-xs text-gray-500">{row.users?.email}</p>
        </div>
      )
    },
    {
      header: 'Page',
      accessor: 'page',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-purple-500" />
          <span className="text-gray-700">{pageOptionMap[row.page_name] || row.page_name}</span>
        </div>
      )
    },
    {
      header: 'Access',
      accessor: 'can_access',
      render: (row) => (
        <button
          onClick={() => toggleAccess(row)}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            row.can_access ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
        >
          {row.can_access ? <Check size={12} /> : <X size={12} />}
          {row.can_access ? 'Allowed' : 'Blocked'}
        </button>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Page Permissions</h1>
          <p className="text-gray-500">Granular access control for Admin tools</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Permission
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search users or pages..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <Table
        columns={columns}
        data={filteredPermissions}
        loading={loading}
        emptyMessage="No permissions configured"
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPermission ? 'Edit Permission' : 'Add Permission'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User *</label>
            <select
              value={formData.user_id}
              onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.itsid} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Page *</label>
            <select
              value={formData.page_name}
              onChange={(e) => setFormData({ ...formData, page_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select page</option>
              {PAGE_OPTIONS.map((page) => (
                <option key={page.value} value={page.value}>
                  {page.label}
                </option>
              ))}
            </select>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={formData.can_access}
              onChange={(e) => setFormData({ ...formData, can_access: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
            />
            User can access this page
          </label>

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
              {editingPermission ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default PagePermissions
