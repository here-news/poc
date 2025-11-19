import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { User } from '../../types/chat'
import SearchBar from './SearchBar'
import UserProfile from './UserProfile'

function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/status')
      if (response.ok) {
        const data = await response.json()
        if (data.authenticated) {
          setUser(data.user)
        }
      }
    } catch (err) {
      console.error('Auth check failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    window.location.href = '/api/auth/login'
  }

  const handleNotifications = () => {
    alert('Notifications coming soon!')
  }

  const handleCreate = () => {
    alert('Create story/quest coming soon!')
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-6 flex-1">
            <Link
              to="/"
              className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap"
            >
              φ HERE
            </Link>

            {/* Search Bar */}
            <div className="hidden md:block flex-1 max-w-md">
              <SearchBar />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {loading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : user ? (
              <>
                <button
                  onClick={handleCreate}
                  className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-600"
                  title="Create new content"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  onClick={handleNotifications}
                  className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-600 relative"
                  title="Notifications"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </button>
                <UserProfile user={user} />
              </>
            ) : (
              <button
                onClick={handleLogin}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="md:hidden px-4 pb-3">
        <SearchBar />
      </div>
    </header>
  )
}

export default Header
