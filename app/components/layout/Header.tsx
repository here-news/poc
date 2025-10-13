import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import UserProfile from '../../UserProfile'
import logoAsset from '../../assets/here_pin_logo.svg'

interface HeaderProps {
  userId: string
}

function Header({ userId }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search on "/" key
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      // Blur search on "Escape" key
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <Link to="/app" className="relative h-14 sm:h-16 cursor-pointer hover:opacity-80 transition-opacity">
        <img
          src={logoAsset}
          alt="Here Pin Logo"
          className="h-full w-auto drop-shadow-sm"
        />
      </Link>

      {/* Center section with Search bar and How it works link */}
      <div className="flex items-center gap-4 flex-1 max-w-2xl mx-4">
        {/* Search bar */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search here"
            className="w-full pl-10 pr-12 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <kbd className="px-2 py-1 text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded">
              /
            </kbd>
          </div>
        </div>

        <Link
          to="/how-it-works"
          className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap"
        >
          How here works
        </Link>
      </div>

      <div className="flex items-center gap-4 self-start sm:self-auto">
        <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors group">
          <svg className="w-6 h-6 text-slate-600 group-hover:text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {/* Notification dot - show when user has notifications */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full"></span>
        </button>
        <UserProfile userId={userId} />
      </div>
    </header>
  )
}

export default Header
