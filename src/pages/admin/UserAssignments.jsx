import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Table from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import { Plus, Pencil, Trash2, UserCog, Search, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

const UserAssignments = () => {
  const [assignments, setAssignments] = useState([])
  const [users, setUsers] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState(null)
  const [formData, setFormData] = useState({
    user_id: '',
    class_id: '',
    subject_id: '',
    branch_id: '',
    can_upload: true,
    can_grade: true,
    can_edit_marks: false,
    can_reevaluate: false
  })

  useEffect(() => {
    fetchLookups()
    fetchAssignments()
  }, [])

  const fetchLookups = async () => {
    try {
      const [userRes, classRes, subjectRes, branchRes] = await Promise.all([
        supabase.from('users').select('*').order('itsid'),
        supabase.from('classes').select('*').order('name'),
        supabase.from('subjects').select('*').order('name'),
        supabase.from('branches').select('*').order('name')
      ])

      if (userRes.error) throw userRes.error
      if (classRes.error) throw classRes.error
      if (subjectRes.error) throw subjectRes.error
      if (branchRes.error) throw branchRes.error

      setUsers(userRes.data || [])
      setClasses(classRes.data || [])
      setSubjects(subjectRes.data || [])
      setBranches(branchRes.data || [])
    } catch (error) {
      toast.error('Failed to load lookup data')
      console.error(error)
    }
  }

  const fetchAssignments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_assignments')
        .select(`
          *,
          users (id, itsid, email),
          classes (id, name),
          subjects (id, name),
          branches (id, name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAssignments(data || [])
    } catch (error) {
      toast.error('Failed to fetch assignments')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      user_id: '',
      class_id: '',
      subject_id: '',
      branch_id: '',
      can_upload: true,
      can_grade: true,
      can_edit_marks: false,
      can_reevaluate: false
    })
    setEditingAssignment(null)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.user_id || !formData.class_id || !formData.subject_id) {
      toast.error('User, Class, and Subject are required')
      return
    }

    const payload = {
      user_id: formData.user_id,
      class_id: formData.class_id,
      subject_id: formData.subject_id,
      branch_id: formData.branch_id || null,
      can_upload: formData.can_upload,
      can_grade: formData.can_grade,
      can_edit_marks: formData.can_edit_marks,
      can_reevaluate: formData.can_reevaluate
    }

    try {
      if (editingAssignment) {
        const { error } = await supabase
          .from('user_assignments')
          .update(payload)
          .eq('id', editingAssignment.id)

        if (error) throw error
        toast.success('Assignment updated')
      } else {
        const { error } = await supabase
          .from('user_assignments')
          .insert([payload])

        if (error) throw error
        toast.success('Assignment created')
      }

      setIsModalOpen(false)
      resetForm()
      fetchAssignments()
    } catch (error) {
      toast.error(error.message || 'Operation failed')
      console.error(error)
    }
  }

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment)
    setFormData({
      user_id: assignment.user_id,
      class_id: assignment.class_id,
      subject_id: assignment.subject_id,
      branch_id: assignment.branch_id || '',
      can_upload: assignment.can_upload,
      can_grade: assignment.can_grade,
      can_edit_marks: assignment.can_edit_marks || false,
      can_reevaluate: assignment.can_reevaluate || false
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (assignment) => {
    if (!window.confirm('Delete this assignment?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('user_assignments')
        .delete()
        .eq('id', assignment.id)

      if (error) throw error
      toast.success('Assignment deleted')
      fetchAssignments()
    } catch (error) {
      toast.error('Unable to delete assignment')
      console.error(error)
    }
  }

  const filteredAssignments = assignments.filter((assignment) => {
    const userName = assignment.users?.itsid?.toLowerCase() || ''
    const email = assignment.users?.email?.toLowerCase() || ''
    const className = assignment.classes?.name?.toLowerCase() || ''
    const subjectName = assignment.subjects?.name?.toLowerCase() || ''
    const term = searchTerm.toLowerCase()
    return (
      userName.includes(term) ||
      email.includes(term) ||
      className.includes(term) ||
      subjectName.includes(term)
    )
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
      header: 'Class',
      accessor: 'class',
      render: (row) => <span className="text-gray-700">{row.classes?.name || '-'}</span>
    },
    {
      header: 'Subject',
      accessor: 'subject',
      render: (row) => <span className="text-gray-700">{row.subjects?.name || '-'}</span>
    },
    {
      header: 'Branch',
      accessor: 'branch',
      render: (row) => <span className="text-gray-600">{row.branches?.name || '-'}</span>
    },
    {
      header: 'Permissions',
      accessor: 'permissions',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              row.can_upload ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {row.can_upload ? <Check size={12} /> : <X size={12} />}
            Upload
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              row.can_grade ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {row.can_grade ? <Check size={12} /> : <X size={12} />}
            Grade
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              row.can_edit_marks ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {row.can_edit_marks ? <Check size={12} /> : <X size={12} />}
            Edit
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              row.can_reevaluate ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {row.can_reevaluate ? <Check size={12} /> : <X size={12} />}
            Re-eval
          </span>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Assignments</h1>
          <p className="text-gray-500">Control which users can manage specific classes & subjects</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Assign User
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search by ITS ID, class, or subject..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <Table
        columns={columns}
        data={filteredAssignments}
        loading={loading}
        emptyMessage="No assignments yet"
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
        title={editingAssignment ? 'Edit Assignment' : 'Add Assignment'}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
              <select
                value={formData.class_id}
                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select class</option>
                {classes.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <select
                value={formData.subject_id}
                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
            <select
              value={formData.branch_id}
              onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Permissions</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.can_upload}
                  onChange={(e) => setFormData({ ...formData, can_upload: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <div>
                  <span className="font-medium">Can Upload</span>
                  <p className="text-xs text-gray-500">Upload answer sheets</p>
                </div>
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.can_grade}
                  onChange={(e) => setFormData({ ...formData, can_grade: e.target.checked })}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded"
                />
                <div>
                  <span className="font-medium">Can Grade</span>
                  <p className="text-xs text-gray-500">View grading results</p>
                </div>
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.can_edit_marks}
                  onChange={(e) => setFormData({ ...formData, can_edit_marks: e.target.checked })}
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded"
                />
                <div>
                  <span className="font-medium">Can Edit Marks</span>
                  <p className="text-xs text-gray-500">Manually adjust marks</p>
                </div>
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.can_reevaluate}
                  onChange={(e) => setFormData({ ...formData, can_reevaluate: e.target.checked })}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded"
                />
                <div>
                  <span className="font-medium">Can Re-evaluate</span>
                  <p className="text-xs text-gray-500">Section-wise AI re-grading</p>
                </div>
              </label>
            </div>
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
              {editingAssignment ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default UserAssignments
