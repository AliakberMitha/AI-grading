import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Table from '../../components/common/Table'
import { Search, Save } from 'lucide-react'
import toast from 'react-hot-toast'

const WeightageSettings = () => {
  const [levels, setLevels] = useState([])
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchLevels()
  }, [])

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

      const normalized = (data || []).map((level) => ({
        ...level,
        weightage: level.weightage || { content: 60, language: 40 }
      }))

      setLevels(normalized)
      setDrafts(
        normalized.reduce((acc, level) => {
          acc[level.id] = {
            content: level.weightage?.content ?? 60,
            language: level.weightage?.language ?? 40,
            max_marks: level.max_marks ?? 100
          }
          return acc
        }, {})
      )
    } catch (error) {
      toast.error('Failed to load weightage data')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDraftChange = (id, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }))
  }

  const handleSave = async (level) => {
    const draft = drafts[level.id]
    if (!draft) {
      return
    }

    const content = Number(draft.content)
    const language = Number(draft.language)
    const total = content + language

    if (total !== 100) {
      toast.error('Content and Language weightage must total 100%')
      return
    }

    try {
      setUpdatingId(level.id)
      const { error } = await supabase
        .from('academic_levels')
        .update({
          weightage: { content, language },
          max_marks: Number(draft.max_marks) || 0
        })
        .eq('id', level.id)

      if (error) throw error
      toast.success('Weightage updated')
      fetchLevels()
    } catch (error) {
      toast.error(error.message || 'Update failed')
      console.error(error)
    } finally {
      setUpdatingId(null)
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
      accessor: 'level',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-800">{row.classes?.name || 'Class'}</p>
          <p className="text-xs text-gray-500">{row.subjects?.name || 'Subject'}</p>
        </div>
      )
    },
    {
      header: 'Content %',
      accessor: 'content',
      render: (row) => (
        <input
          type="number"
          min="0"
          max="100"
          value={drafts[row.id]?.content ?? 0}
          onChange={(e) => handleDraftChange(row.id, 'content', e.target.value)}
          className="w-24 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      )
    },
    {
      header: 'Language %',
      accessor: 'language',
      render: (row) => (
        <input
          type="number"
          min="0"
          max="100"
          value={drafts[row.id]?.language ?? 0}
          onChange={(e) => handleDraftChange(row.id, 'language', e.target.value)}
          className="w-24 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      )
    },
    {
      header: 'Max Marks',
      accessor: 'max_marks',
      render: (row) => (
        <input
          type="number"
          min="0"
          value={drafts[row.id]?.max_marks ?? 0}
          onChange={(e) => handleDraftChange(row.id, 'max_marks', e.target.value)}
          className="w-28 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Weightage & Max Marks</h1>
          <p className="text-gray-500">Fine-tune AI scoring weightage per level</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search levels..."
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
          <button
            onClick={() => handleSave(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={updatingId === row.id}
          >
            <Save size={14} />
            {updatingId === row.id ? 'Saving...' : 'Save'}
          </button>
        )}
      />

      <p className="text-xs text-gray-500">
        Ensure that content + language weightage always equals 100% for optimal AI grading prompts.
      </p>
    </div>
  )
}

export default WeightageSettings
