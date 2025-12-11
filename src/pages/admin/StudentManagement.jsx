import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Table from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import { Plus, Pencil, Trash2, Users, Search, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

const StudentManagement = () => {
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    roll_number: '',
    class_id: '',
    branch_id: '',
    email: '',
    phone: '',
    is_active: true
  })

  useEffect(() => {
    fetchLookups()
    fetchStudents()
  }, [])

  const fetchLookups = async () => {
    try {
      const [classRes, branchRes] = await Promise.all([
        supabase.from('classes').select('*').order('name'),
        supabase.from('branches').select('*').order('name')
      ])

      if (classRes.error) throw classRes.error
      if (branchRes.error) throw branchRes.error

      setClasses(classRes.data || [])
      setBranches(branchRes.data || [])
    } catch (error) {
      toast.error('Failed to load lookup data')
      console.error(error)
    }
  }

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          classes (id, name),
          branches (id, name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      toast.error('Failed to fetch students')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      roll_number: '',
      class_id: '',
      branch_id: '',
      email: '',
      phone: '',
      is_active: true
    })
    setEditingStudent(null)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.roll_number.trim() || !formData.class_id) {
      toast.error('Name, Roll number and Class are required')
      return
    }

    const payload = {
      name: formData.name,
      roll_number: formData.roll_number,
      class_id: formData.class_id,
      branch_id: formData.branch_id || null,
      email: formData.email || null,
      phone: formData.phone || null,
      is_active: formData.is_active
    }

    try {
      if (editingStudent) {
        const { error } = await supabase
          .from('students')
          .update(payload)
          .eq('id', editingStudent.id)

        if (error) throw error
        toast.success('Student updated')
      } else {
        const { error } = await supabase
          .from('students')
          .insert([payload])

        if (error) throw error
        toast.success('Student added')
      }

      setIsModalOpen(false)
      resetForm()
      fetchStudents()
    } catch (error) {
      toast.error(error.message || 'Operation failed')
      console.error(error)
    }
  }

  const handleEdit = (student) => {
    setEditingStudent(student)
    setFormData({
      name: student.name,
      roll_number: student.roll_number,
      class_id: student.class_id,
      branch_id: student.branch_id || '',
      email: student.email || '',
      phone: student.phone || '',
      is_active: student.is_active
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (student) => {
    if (!window.confirm(`Delete student ${student.name}?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', student.id)

      if (error) throw error
      toast.success('Student deleted')
      fetchStudents()
    } catch (error) {
      toast.error('Unable to delete student')
      console.error(error)
    }
  }

  const filteredStudents = students.filter((student) => {
    const term = searchTerm.toLowerCase()
    const name = student.name?.toLowerCase() || ''
    const roll = student.roll_number?.toLowerCase() || ''
    const className = student.classes?.name?.toLowerCase() || ''
    return name.includes(term) || roll.includes(term) || className.includes(term)
  })

  const columns = [
    {
      header: 'Student',
      accessor: 'name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Users size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-800">{row.name}</p>
            <p className="text-xs text-gray-500">Roll: {row.roll_number}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Class',
      accessor: 'class',
      render: (row) => <span className="text-gray-700">{row.classes?.name || '-'}</span>
    },
    {
      header: 'Branch',
      accessor: 'branch',
      render: (row) => <span className="text-gray-600">{row.branches?.name || '-'}</span>
    },
    {
      header: 'Contact',
      accessor: 'contact',
      render: (row) => (
        <div className="text-sm text-gray-600">
          <p>{row.email || '-'}</p>
          <p>{row.phone || '-'}</p>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            row.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
          }`}
        >
          {row.is_active ? <Check size={12} /> : <X size={12} />}
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Student Master</h1>
          <p className="text-gray-500">Maintain the roster synced with AI grading</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Student
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search students..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <Table
        columns={columns}
        data={filteredStudents}
        loading={loading}
        emptyMessage="No students found"
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
        title={editingStudent ? 'Edit Student' : 'Add Student'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number *</label>
              <input
                type="text"
                value={formData.roll_number}
                onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
            />
            Active
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
              {editingStudent ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default StudentManagement
