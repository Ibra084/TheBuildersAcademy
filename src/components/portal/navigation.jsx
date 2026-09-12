export function NavIcon({ type, size = 18 }) {
  const paths = {
    grid: <path d="M4 4h6.5v6.5H4V4Zm9.5 0H20v6.5h-6.5V4ZM4 13.5h6.5V20H4v-6.5Zm9.5 0H20V20h-6.5v-6.5Z" />,
    calendar: (
      <>
        <rect x="4" y="5.5" width="16" height="14.5" rx="1.8" />
        <path d="M4 9.5h16M8 3.5v3M16 3.5v3" strokeLinecap="round" />
      </>
    ),
    folder: <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h4l2 2H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5v-11Z" />,
    book: (
      <>
        <path d="M5 4.5h6.5a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2V4.5Z" />
        <path d="M13.5 6.5H18a1 1 0 0 1 1 1V18a2 2 0 0 1-2 2h-3.5" />
      </>
    ),
    digest: (
      <>
        <rect x="4.5" y="4.5" width="15" height="15" rx="2" />
        <path d="M8 9h8M8 12.5h8M8 16h5" strokeLinecap="round" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8.5" r="3" />
        <path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
        <circle cx="17" cy="8.5" r="2.3" />
        <path d="M15 15.3c2.4.3 4.5 2.1 4.5 4.7" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M9.5 9.3a2.5 2.5 0 1 1 3.6 2.2c-.9.5-1.3 1-1.3 1.9" />
        <path d="M12 17h.01" />
      </>
    ),
    logout: (
      <>
        <path d="M9 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H9" />
        <path d="M14 8l4 4-4 4" />
        <path d="M18 12H9" />
      </>
    ),
    shield: <path d="M12 3.5 5 6v5.5c0 4.2 2.9 7.3 7 8.5 4.1-1.2 7-4.3 7-8.5V6l-7-2.5Zm-1.6 10.3-2-2 1.1-1.1 1 1 3.1-3.1 1.1 1.1-4.2 4.1Z" />,
    chevronLeft: <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />,
    chevronRight: <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />,
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className="shrink-0">
      {paths[type]}
    </svg>
  )
}



