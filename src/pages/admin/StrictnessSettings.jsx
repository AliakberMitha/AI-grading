import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Table from '../../components/common/Table'
import { Search, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

const StrictnessSettings = () => {
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

      setLevels(data || [])
      setDrafts(
        (data || []).reduce((acc, level) => {
          acc[level.id] = {
            strictness_level: level.strictness_level ?? 50,
            grading_instructions: level.grading_instructions || ''
          }
          return acc
        }, {})
      )
    } catch (error) {
      toast.error('Failed to load strictness data')
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

    const strictnessValue = Number(draft.strictness_level)
    if (strictnessValue < 0 || strictnessValue > 100) {
      toast.error('Strictness must be between 0 and 100')
      return
    }

    try {
      setUpdatingId(level.id)
      const { error } = await supabase
        .from('academic_levels')
        .update({
          strictness_level: strictnessValue,
          grading_instructions: draft.grading_instructions || null
        })
        .eq('id', level.id)

      if (error) throw error
      toast.success('Strictness updated')
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
      header: 'Strictness',
      accessor: 'strictness',
      render: (row) => (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Soft</span>
            <span>{drafts[row.id]?.strictness_level ?? 0}%</span>
            <span>Strict</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={drafts[row.id]?.strictness_level ?? 0}
            onChange={(e) => handleDraftChange(row.id, 'strictness_level', e.target.value)}
            className="w-full"
          />
        </div>
      )
    },
    {
      header: 'Prompt Notes',
      accessor: 'instructions',
      render: (row) => (
        <textarea
          rows={2}
          value={drafts[row.id]?.grading_instructions || ''}
          onChange={(e) => handleDraftChange(row.id, 'grading_instructions', e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Add grading remarks or tone guidance"
        />
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Strictness Settings</h1>
          <p className="text-gray-500">Control AI grading tone per class + subject</p>
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
        emptyMessage="No academic levels found"
        actions={(row) => (
          <button
            onClick={() => handleSave(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors disabled:opacity-50"
            disabled={updatingId === row.id}
          >
            <ShieldCheck size={14} />
            {updatingId === row.id ? 'Saving...' : 'Save'}
          </button>
        )}
      />

      <p className="text-xs text-gray-500">
        Strictness guides Gemini on how lenient or strict to be when evaluating the uploaded answers.
      </p>
    </div>
  )
}

export default StrictnessSettings
