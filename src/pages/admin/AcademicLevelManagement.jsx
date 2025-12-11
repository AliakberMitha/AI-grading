import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Table from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import { Plus, Pencil, Trash2, GraduationCap, Search } from 'lucide-react'
import toast from 'react-hot-toast'

const AcademicLevelManagement = () => {
  const [levels, setLevels] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLevel, setEditingLevel] = useState(null)
  const [formData, setFormData] = useState({
    class_id: '',
    subject_id: '',
    weightage_content: 60,
    weightage_language: 40,
    max_marks: 100,
    strictness_level: 50,
    grading_instructions: ''
  })

  useEffect(() => {
    fetchLookups()
    fetchLevels()
  }, [])

  const fetchLookups = async () => {
    try {
      const [classesRes, subjectsRes] = await Promise.all([
        supabase.from('classes').select('*').order('name'),
        supabase.from('subjects').select('*').order('name')
      ])

      if (classesRes.error) throw classesRes.error
      if (subjectsRes.error) throw subjectsRes.error

      setClasses(classesRes.data || [])
      setSubjects(subjectsRes.data || [])
    } catch (error) {
      toast.error('Failed to load lookups')
      console.error(error)
    }
  }

  const fetchLevels = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('academic_levels')
        .select(`
          *,
          classes (id, name),
          subjects (id, name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLevels(data || [])
    } catch (error) {
      toast.error('Failed to fetch academic levels')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      class_id: '',
      subject_id: '',
      weightage_content: 60,
      weightage_language: 40,
      max_marks: 100,
      strictness_level: 50,
      grading_instructions: ''
    })
    setEditingLevel(null)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.class_id || !formData.subject_id) {
      toast.error('Class and Subject are required')
      return
    }

    const contentWeight = Number(formData.weightage_content)
    const languageWeight = Number(formData.weightage_language)
    const totalWeight = contentWeight + languageWeight

    if (totalWeight !== 100) {
      toast.error('Content and Language weightage must add up to 100%')
      return
    }

    if (Number(formData.strictness_level) < 0 || Number(formData.strictness_level) > 100) {
      toast.error('Strictness must be between 0 and 100')
      return
    }

    const payload = {
      class_id: formData.class_id,
      subject_id: formData.subject_id,
      weightage: {
        content: contentWeight,
        language: languageWeight
      },
      max_marks: Number(formData.max_marks) || 0,
      strictness_level: Number(formData.strictness_level) || 0,
      grading_instructions: formData.grading_instructions || null
    }

    try {
      if (editingLevel) {
        const { error } = await supabase
          .from('academic_levels')
          .update(payload)
          .eq('id', editingLevel.id)

        if (error) throw error
        toast.success('Academic level updated')
      } else {
        const { error } = await supabase
          .from('academic_levels')
          .insert([payload])

        if (error) throw error
        toast.success('Academic level created')
      }

      setIsModalOpen(false)
      resetForm()
      fetchLevels()
    } catch (error) {
      toast.error(error.message || 'Operation failed')
      console.error(error)
    }
  }

  const handleEdit = (level) => {
    setEditingLevel(level)
    setFormData({
      class_id: level.class_id,
      subject_id: level.subject_id,
      weightage_content: level.weightage?.content ?? 60,
      weightage_language: level.weightage?.language ?? 40,
      max_marks: level.max_marks ?? 100,
      strictness_level: level.strictness_level ?? 50,
      grading_instructions: level.grading_instructions || ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (level) => {
    if (!window.confirm('Delete this academic level?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('academic_levels')
        .delete()
        .eq('id', level.id)

      if (error) throw error
      toast.success('Academic level deleted')
      fetchLevels()
    } catch (error) {
      toast.error('Unable to delete level')
      console.error(error)
    }
  }

  const filteredLevels = levels.filter((level) => {
    const className = level.classes?.name?.toLowerCase() || ''
    const subjectName = level.subjects?.name?.toLowerCase() || ''
    const term = searchTerm.toLowerCase()
    return className.includes(term) || subjectName.includes(term)
  })

  const columns = [
    {
      header: 'Academic Level',
      accessor: 'class_subject',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <GraduationCap size={20} className="text-indigo-600" />
          </div>
          <div>
            <p className="font-medium text-gray-800">{row.classes?.name || 'Class'}</p>
            <p className="text-xs text-gray-500">{row.subjects?.name || 'Subject'}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Weightage',
      accessor: 'weightage',
      render: (row) => (
        <div>
          <p className="text-sm text-gray-700">Content: {row.weightage?.content ?? 0}%</p>
          <p className="text-sm text-gray-500">Language: {row.weightage?.language ?? 0}%</p>
        </div>
      )
    },
    {
      header: 'Max Marks',
      accessor: 'max_marks',
      render: (row) => (
        <span className="font-medium text-gray-700">{row.max_marks || 0}</span>
      )
    },
    {
      header: 'Strictness',
      accessor: 'strictness_level',
      render: (row) => (
        <div className="w-40">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Soft</span>
            <span>{row.strictness_level ?? 0}%</span>
            <span>Strict</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full mt-1">
            <div
              className="h-full bg-indigo-500 rounded-full"
              style={{ width: `${row.strictness_level || 0}%` }}
            ></div>
          </div>
        </div>
      )
    },
    {
      header: 'Instructions',
      accessor: 'grading_instructions',
      render: (row) => (
        <span className="text-sm text-gray-600">
          {row.grading_instructions ? `${row.grading_instructions.slice(0, 50)}${row.grading_instructions.length > 50 ? '...' : ''}` : '-'}
        </span>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Academic Levels</h1>
          <p className="text-gray-500">Configure class and subject level grading rules</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Level
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search by class or subject..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <Table
        columns={columns}
        data={filteredLevels}
        loading={loading}
        emptyMessage="No academic levels configured"
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
        title={editingLevel ? 'Edit Academic Level' : 'Add Academic Level'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content Weightage (%)</label>
              <input
                type="number"
                value={formData.weightage_content}
                onChange={(e) => setFormData({ ...formData, weightage_content: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language Weightage (%)</label>
              <input
                type="number"
                value={formData.weightage_language}
                onChange={(e) => setFormData({ ...formData, weightage_language: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Marks</label>
              <input
                type="number"
                value={formData.max_marks}
                onChange={(e) => setFormData({ ...formData, max_marks: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Strictness Level ({formData.strictness_level}%)</label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.strictness_level}
              onChange={(e) => setFormData({ ...formData, strictness_level: e.target.value })}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grading Instructions</label>
            <textarea
              rows={4}
              value={formData.grading_instructions}
              onChange={(e) => setFormData({ ...formData, grading_instructions: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any AI prompt notes or rubric details"
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
              {editingLevel ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default AcademicLevelManagement
