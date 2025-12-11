import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import FileUploader from '../../components/common/FileUploader'
import { Upload, FileText, AlertCircle, CheckCircle, Users, CheckSquare, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

// Scanning Animation Overlay Component
const ScanningOverlay = ({ status }) => {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Paper with scanning effect */}
        <div className="relative w-48 h-64 mx-auto mb-6 bg-gray-100 rounded-lg shadow-lg overflow-hidden border-2 border-gray-200">
          {/* Paper lines */}
          <div className="absolute inset-4 space-y-3">
            <div className="h-2 bg-gray-300 rounded w-3/4"></div>
            <div className="h-2 bg-gray-300 rounded w-full"></div>
            <div className="h-2 bg-gray-300 rounded w-5/6"></div>
            <div className="h-2 bg-gray-300 rounded w-2/3"></div>
            <div className="h-2 bg-gray-300 rounded w-full"></div>
            <div className="h-2 bg-gray-300 rounded w-4/5"></div>
            <div className="h-2 bg-gray-300 rounded w-3/4"></div>
            <div className="h-2 bg-gray-300 rounded w-full"></div>
          </div>
          
          {/* Scanning line animation */}
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scan shadow-[0_0_15px_5px_rgba(59,130,246,0.5)]"></div>
          
          {/* Corner decorations */}
          <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-blue-500"></div>
          <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-blue-500"></div>
          <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-blue-500"></div>
          <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-blue-500"></div>
        </div>

        {/* Status text */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-lg font-semibold text-gray-800">{status}</span>
          </div>
          <p className="text-sm text-gray-500">Please wait while we process your answer sheet...</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-6">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>

      {/* Add keyframes for scan animation */}
      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: calc(100% - 4px); }
          100% { top: 0; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

const UploadAnswerSheet = () => {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [questionPapers, setQuestionPapers] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [scanStatus, setScanStatus] = useState('') // Status text for scanning animation
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadStatus, setUploadStatus] = useState(null) // 'success' | 'duplicate' | 'error'
  
  // Stats for selected class/subject/question paper
  const [stats, setStats] = useState({
    totalStudents: 0,
    completed: 0,
    pending: 0
  })

  const [formData, setFormData] = useState({
    class_id: '',
    subject_id: '',
    question_paper_id: '',
    manual_roll_number: '' // Optional manual entry
  })

  useEffect(() => {
    if (user) {
      fetchAssignments()
    }
  }, [user])

  useEffect(() => {
    if (formData.class_id && formData.subject_id) {
      fetchQuestionPapers(formData.class_id, formData.subject_id)
    } else {
      setQuestionPapers([])
    }
  }, [formData.class_id, formData.subject_id])

  // Fetch stats when class and question paper are selected
  useEffect(() => {
    if (formData.class_id && formData.question_paper_id) {
      fetchStats()
    } else {
      setStats({ totalStudents: 0, completed: 0, pending: 0 })
    }
  }, [formData.class_id, formData.question_paper_id])

  const fetchAssignments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_assignments')
        .select(`
          *,
          classes (id, name),
          subjects (id, name)
        `)
        .eq('user_id', user.id)
        .eq('can_upload', true)

      if (error) throw error
      setAssignments(data || [])
    } catch (error) {
      toast.error('Failed to load assignments')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchQuestionPapers = async (classId, subjectId) => {
    try {
      const { data, error } = await supabase
        .from('question_papers')
        .select('*')
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setQuestionPapers(data || [])
    } catch (error) {
      console.error('Error fetching question papers:', error)
    }
  }

  const fetchStats = async () => {
    try {
      // Get total students in class
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, roll_number')
        .eq('class_id', formData.class_id)
        .eq('is_active', true)

      if (studentsError) throw studentsError

      // Get completed answer sheets for this question paper
      const { data: answerSheets, error: sheetsError } = await supabase
        .from('answer_sheets')
        .select('id, extracted_roll_number, status')
        .eq('question_paper_id', formData.question_paper_id)
        .eq('graded_by', user.id)

      if (sheetsError) throw sheetsError

      const totalStudents = students?.length || 0
      const completed = answerSheets?.filter(s => s.status === 'graded').length || 0
      const pending = totalStudents - completed

      setStats({
        totalStudents,
        completed,
        pending: pending > 0 ? pending : 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  // Generate file hash for duplicate detection
  const generateFileHash = async (file) => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  }

  const checkDuplicate = async (fileHash) => {
    const { data, error } = await supabase
      .from('answer_sheets')
      .select('id')
      .eq('file_hash', fileHash)
      .maybeSingle()

    if (error) {
      throw error
    }

    return !!data
  }

  const uploadFileToStorage = async (file) => {
    const sanitizedName = file.name.replace(/\s+/g, '-').toLowerCase()
    const filePath = `${Date.now()}-${sanitizedName}`

    const { error: uploadError } = await supabase.storage
      .from('answer-sheets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('answer-sheets')
      .getPublicUrl(filePath)

    return {
      file_url: data.publicUrl,
      file_name: file.name,
      file_path: filePath
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setUploadStatus(null)

    if (!formData.class_id || !formData.subject_id || !formData.question_paper_id) {
      toast.error('Please select class, subject and question paper')
      return
    }

    if (!selectedFile) {
      toast.error('Please upload an answer sheet file')
      return
    }

    try {
      setUploading(true)

      // Step 1: Generate file hash
      setScanStatus('Checking for duplicates...')
      const fileHash = await generateFileHash(selectedFile)

      // Step 2: Check for duplicates
      const isDuplicate = await checkDuplicate(fileHash)
      if (isDuplicate) {
        setUploadStatus('duplicate')
        toast.error('This answer sheet has already been uploaded!')
        return
      }

      // Step 3: Upload file to storage
      setScanStatus('Uploading answer sheet...')
      const fileData = await uploadFileToStorage(selectedFile)

      // Step 4: Create answer sheet record (without student_id)
      setScanStatus('Creating record...')
      const { data: answerSheet, error: insertError } = await supabase
        .from('answer_sheets')
        .insert([{
          question_paper_id: formData.question_paper_id,
          class_id: formData.class_id,
          subject_id: formData.subject_id,
          file_url: fileData.file_url,
          file_name: fileData.file_name,
          file_hash: fileHash,
          status: 'pending',
          graded_by: user.id,
          // Save manual roll number if provided (will be overwritten by AI if extracted)
          extracted_roll_number: formData.manual_roll_number || null
        }])
        .select()
        .maybeSingle()

      if (insertError) throw insertError

      // Step 5: Trigger AI grading (Edge Function call)
      setScanStatus('AI is analyzing the answer sheet...')
      try {
        const { error: gradeError } = await supabase.functions.invoke('grade-answer-sheet', {
          body: { answer_sheet_id: answerSheet.id }
        })

        if (gradeError) {
          console.error('Grading error:', gradeError)
        }
      } catch (fnError) {
        console.error('Edge function error:', fnError)
      }

      setUploadStatus('success')
      toast.success('Answer sheet uploaded successfully! AI grading in progress...')
      
      // Reset only file and manual roll number, keep class/subject/question paper
      setSelectedFile(null)
      setFormData(prev => ({
        ...prev,
        manual_roll_number: ''
      }))
      
      // Refresh stats
      fetchStats()

    } catch (error) {
      setUploadStatus('error')
      toast.error(error.message || 'Upload failed')
      console.error(error)
    } finally {
      setUploading(false)
      setScanStatus('')
    }
  }

  // Get unique classes from assignments
  const uniqueClasses = [...new Map(
    assignments.map(a => [a.class_id, { id: a.class_id, name: a.classes?.name }])
  ).values()]

  // Get subjects for selected class
  const availableSubjects = assignments
    .filter(a => a.class_id === formData.class_id)
    .map(a => ({ id: a.subject_id, name: a.subjects?.name }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Scanning Animation Overlay */}
      {uploading && <ScanningOverlay status={scanStatus} />}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Upload size={28} />
          <h1 className="text-2xl font-bold">Upload Answer Sheet</h1>
        </div>
        <p className="text-blue-100">
          Upload student answer sheets for AI-powered grading. Magic number will be extracted automatically.
        </p>
      </div>

      {/* Stats Cards */}
      {formData.question_paper_id && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-xl font-bold text-gray-800">{stats.totalStudents}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckSquare size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-xl font-bold text-green-600">{stats.completed}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {uploadStatus === 'success' && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="text-green-600" size={24} />
          <div>
            <p className="font-medium text-green-800">Upload Successful!</p>
            <p className="text-sm text-green-600">The answer sheet is being processed. Magic number will be extracted automatically.</p>
          </div>
        </div>
      )}

      {uploadStatus === 'duplicate' && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <AlertCircle className="text-yellow-600" size={24} />
          <div>
            <p className="font-medium text-yellow-800">Duplicate Detected!</p>
            <p className="text-sm text-yellow-600">This exact file has already been uploaded.</p>
          </div>
        </div>
      )}

      {/* Upload Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Class & Subject Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class *
              </label>
              <select
                value={formData.class_id}
                onChange={(e) => setFormData({
                  ...formData,
                  class_id: e.target.value,
                  subject_id: '',
                  question_paper_id: ''
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Class</option>
                {uniqueClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              <select
                value={formData.subject_id}
                onChange={(e) => setFormData({
                  ...formData,
                  subject_id: e.target.value,
                  question_paper_id: ''
                })}
                disabled={!formData.class_id}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Select Subject</option>
                {availableSubjects.map((subj) => (
                  <option key={subj.id} value={subj.id}>{subj.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Question Paper Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Paper *
            </label>
            <select
              value={formData.question_paper_id}
              onChange={(e) => setFormData({ ...formData, question_paper_id: e.target.value })}
              disabled={!formData.class_id || !formData.subject_id}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Select Question Paper</option>
              {questionPapers.map((paper) => (
                <option key={paper.id} value={paper.id}>
                  {paper.title} ({paper.total_marks} marks)
                </option>
              ))}
            </select>
            {formData.class_id && formData.subject_id && questionPapers.length === 0 && (
              <p className="text-sm text-yellow-600 mt-1">No question papers found for this class/subject</p>
            )}
          </div>

          {/* Manual Roll Number (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Manual Magic Number <span className="text-gray-400">(Optional - AI will extract automatically)</span>
            </label>
            <input
              type="text"
              value={formData.manual_roll_number}
              onChange={(e) => setFormData({ ...formData, manual_roll_number: e.target.value })}
              placeholder="Enter if AI extraction fails"
              maxLength={15}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty for automatic extraction. Use this only if the magic number is not clearly visible.
            </p>
          </div>

          {/* File Upload */}
          <FileUploader
            label="Answer Sheet File *"
            onFileSelect={setSelectedFile}
            accept=".pdf,.png,.jpg,.jpeg"
            maxSize={25}
          />

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <FileText className="text-blue-600 mt-0.5" size={20} />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Upload PDF or image files up to 25MB</li>
                  <li>AI will automatically extract the magic number from the center</li>
                  <li>Duplicate files are automatically detected</li>
                  <li>AI will grade based on the question paper and weightage settings</li>
                  <li>Results typically available within 1-2 minutes</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload size={20} />
            Upload Answer Sheet
          </button>
        </form>
      </div>
    </div>
  )
}

export default UploadAnswerSheet
