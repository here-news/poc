import React from 'react'
import { Link } from 'react-router-dom'
import UserProfile from '../../UserProfile'
import logoAsset from '../../assets/here_pin_logo.svg'

interface HeaderProps {
  userId: string
}

function Header({ userId }: HeaderProps) {
  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
      <Link to="/app" className="relative h-14 sm:h-16 cursor-pointer hover:opacity-80 transition-opacity">
        <img
          src={logoAsset}
          alt="Here Pin Logo"
          className="h-full w-auto drop-shadow-sm"
        />
      </Link>
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
