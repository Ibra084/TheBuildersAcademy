import { Link } from 'react-router-dom'
import logo from '../lib/logo.png'

export default function Navbar() {
  return (
    <header className="fixed top-4 inset-x-4 sm:inset-x-6 z-50">
      <nav aria-label="Main navigation" className="glass-nav mx-auto max-w-6xl rounded-full pl-4 pr-2 sm:pl-5 sm:pr-3 h-16 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2"><img src={logo} alt="" className="w-9 h-9 rounded-xl object-contain" /><span className="text-sm font-semibold tracking-tight">The Builders</span></Link>
        <div className="hidden md:flex items-center gap-7 text-xs font-medium text-ink-soft"><a href="#what-we-do">The community</a><a href="#how-it-works">How it works</a><a href="#portal-preview">The portal</a></div>
        <Link to="/login" className="solid-btn rounded-full px-4 sm:px-5 py-3 text-xs font-semibold text-white">Member portal <span aria-hidden="true" className="ml-1">↗</span></Link>
      </nav>
    </header>
  )
}
