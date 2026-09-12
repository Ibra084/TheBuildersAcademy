import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getProjects, addProject } from '../../lib/store'

const inputClass =
  'w-full rounded-xl bg-white/80 border border-black/[0.08] px-4 py-2.5 text-[14px] text-ink placeholder:text-ink-soft/50 outline-none focus:ring-2 focus:ring-accent-blue/40 transition-shadow'

function ProjectCard({ project }) {
  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col">
      <h3 className="text-[16px] font-bold tracking-tight text-ink mb-2">{project.name}</h3>
      <p className="text-[14px] text-ink-soft leading-relaxed flex-1 mb-4">{project.description}</p>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-ink-soft">
          {project.builder} · {project.year}
        </p>
        {project.link && (
          <a href={project.link} className="text-[13px] font-semibold text-accent-blue">
            View live ↗
          </a>
        )}
      </div>
    </div>
  )
}

export default function Projects() {
  const { user } = useAuth()
  const [projects, setProjects] = useState(() => getProjects())
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', link: '' })

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const next = addProject({ ...form, builder: user.name, year: user.year })
    setProjects(next)
    setForm({ name: '', description: '', link: '' })
    setShowForm(false)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">Project Showcase</h1>
          <p className="mt-1.5 text-[15px] text-ink-soft">See what other members are building — or add your own.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="solid-btn rounded-full px-5 py-2.5 text-[14px] font-semibold text-white"
        >
          {showForm ? 'Cancel' : '+ Submit a project'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Project name</label>
            <input required value={form.name} onChange={handleChange('name')} className={inputClass} placeholder="StudyBuddy AI" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Description</label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={handleChange('description')}
              className={`${inputClass} resize-none`}
              placeholder="What does it do?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Link (optional)</label>
            <input
              type="url"
              value={form.link}
              onChange={handleChange('link')}
              className={inputClass}
              placeholder="https://"
            />
          </div>
          <button type="submit" className="solid-btn rounded-xl px-5 py-2.5 text-[14px] font-semibold text-white">
            Add project
          </button>
        </form>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}
