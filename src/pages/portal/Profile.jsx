import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getInitials } from '../../lib/auth'

const inputClass =
  'w-full rounded-xl bg-white/80 border border-black/[0.08] px-4 py-2.5 text-[14px] text-ink placeholder:text-ink-soft/50 outline-none focus:ring-2 focus:ring-accent-blue/40 transition-shadow'

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const [whatBuilding, setWhatBuilding] = useState(user?.whatBuilding || '')
  const [photo, setPhoto] = useState(user?.photo || null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPhoto(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
    await updateProfile({ whatBuilding, photo })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">My Profile</h1>
        <p className="mt-1.5 text-[15px] text-ink-soft">Keep others in the community up to date on what you're building.</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-accent-blue flex items-center justify-center text-white text-lg font-semibold overflow-hidden shrink-0">
            {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : getInitials(user?.name)}
          </div>
          <div>
            <label className="inline-block text-[13px] font-semibold text-accent-blue cursor-pointer">
              Change photo
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </label>
            <p className="text-[12px] text-ink-soft/70 mt-0.5">Optional. JPG or PNG.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Name</label>
            <input value={user?.name || ''} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Year group</label>
            <input value={user?.year || ''} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">What are you building or learning?</label>
          <textarea
            rows={3}
            value={whatBuilding}
            onChange={(e) => setWhatBuilding(e.target.value)}
            className={`${inputClass} resize-none`}
            placeholder="Tell the community what you're working on"
          />
        </div>

        <div className="flex items-center gap-4">
          <button disabled={saving} type="submit" className="solid-btn rounded-xl px-6 py-2.5 text-[14px] font-semibold text-white">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-[13px] font-medium text-accent-teal">Saved.</p>}
        </div>
      </form>
    </div>
  )
}

