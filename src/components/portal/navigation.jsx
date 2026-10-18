import {
  LayoutGrid, CalendarDays, Folder, BookOpen, Newspaper, Users, User, CircleHelp,
  LogOut, ShieldCheck, ChevronLeft, ChevronRight, Target, Search, Bell,
} from 'lucide-react'

// Lucide icons, matching the RecifeAI icon set. Keyed by the same names the
// nav links and pages already use.
const icons = {
  grid: LayoutGrid,
  calendar: CalendarDays,
  folder: Folder,
  book: BookOpen,
  digest: Newspaper,
  users: Users,
  user: User,
  help: CircleHelp,
  logout: LogOut,
  shield: ShieldCheck,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  target: Target,
  search: Search,
  bell: Bell,
}

export function NavIcon({ type, size = 18, className = '' }) {
  const Icon = icons[type]
  return <Icon size={size} strokeWidth={1.75} className={`shrink-0 ${className}`} aria-hidden="true" />
}
