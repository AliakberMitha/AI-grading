import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const PasswordConfirmModal = ({
  isOpen,
  title = 'Confirm Password',
  message = 'Enter your password to continue.',
  confirmLabel = 'Verify',
  onCancel,
  onVerified
}) => {
  const [password, setPassword] = useState('')
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    if (isOpen) return
    setPassword('')
    setVerifying(false)
  }, [isOpen])

  const canSubmit = useMemo(() => password.trim().length > 0 && !verifying, [password, verifying])

  const handleVerify = async (e) => {
    e?.preventDefault?.()
    if (!password.trim()) {
      toast.error('Password is required')
      return
    }

    try {
      setVerifying(true)
      const { data: userRes, error: userErr } = await supabase.auth.getUser()
      if (userErr) throw userErr

      const email = userRes?.user?.email
      if (!email) {
        throw new Error('No active user session')
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      await onVerified?.()
      setPassword('')
    } catch (error) {
      toast.error(error?.message || 'Password verification failed')
      console.error(error)
    } finally {
      setVerifying(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <form onSubmit={handleVerify} className="space-y-4">
        <p className="text-sm text-gray-600">{message}</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Enter your password"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            disabled={verifying}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            disabled={!canSubmit}
          >
            {verifying ? 'Verifying...' : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default PasswordConfirmModal
