import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Table from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import { Plus, Pencil, Trash2, School, Search } from 'lucide-react'
import toast from 'react-hot-toast'

const ClassManagement = () => {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: ''
  })

  useEffect(() => {
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name')

      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      toast.error('Failed to fetch classes')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Class name is required')
      return
    }

    try {
      if (editingClass) {
        const { error } = await supabase
          .from('classes')
          .update({
            name: formData.name,
            code: formData.code,
            description: formData.description
          })
          .eq('id', editingClass.id)

        if (error) throw error
        toast.success('Class updated successfully')
      } else {
        const { error } = await supabase
          .from('classes')
          .insert([{
            name: formData.name,
            code: formData.code,
            description: formData.description
          }])

        if (error) throw error
        toast.success('Class created successfully')
      }

      setIsModalOpen(false)
      resetForm()
      fetchClasses()
    } catch (error) {
      toast.error(error.message || 'Operation failed')
      console.error(error)
    }
  }

  const handleEdit = (classItem) => {
    setEditingClass(classItem)
    setFormData({
      name: classItem.name,
      code: classItem.code || '',
      description: classItem.description || ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (classItem) => {
    if (!window.confirm(`Are you sure you want to delete "${classItem.name}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classItem.id)

      if (error) throw error
      toast.success('Class deleted successfully')
      fetchClasses()
    } catch (error) {
      toast.error('Failed to delete class. It may have associated data.')
      console.error(error)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', code: '', description: '' })
    setEditingClass(null)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const filteredClasses = classes.filter(classItem =>
    classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.code?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns = [
    {
      header: 'Class Name',
      accessor: 'name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <School size={20} className="text-green-600" />
          </div>
          <div>
            <p className="font-medium text-gray-800">{row.name}</p>
            {row.code && <p className="text-xs text-gray-500">{row.code}</p>}
          </div>
        </div>
      )
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (row) => (
        <span className="text-gray-600">{row.description || '-'}</span>
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
          <h1 className="text-2xl font-bold text-gray-800">Class Management</h1>
          <p className="text-gray-500">Manage all classes in the system</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Class
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search classes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredClasses}
        loading={loading}
        emptyMessage="No classes found"
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
        title={editingClass ? 'Edit Class' : 'Add New Class'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Class Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Class 10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Class Code
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., X, XII"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter class description"
            />
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
              {editingClass ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ClassManagement
