import React, { useState } from 'react'

function LandingPage() {
  const [activeTab, setActiveTab] = useState('here')

  const renderTabContent = () => {
    switch (activeTab) {
      case 'here':
        return (
          <div className="text-center py-20">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">HERE - All Narratives</h1>
              <p className="text-gray-600 text-lg">Stories and discussions from everywhere - your local area and beyond</p>
            </div>
            <div className="max-w-2xl mx-auto">
              <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-lg">
                <div className="text-6xl mb-6">🗞️</div>
                <p className="text-gray-700 text-lg leading-relaxed">
                  We're building a new way to experience news.<br />
                  A platform where local stories connect to global views.
                </p>
              </div>
            </div>
          </div>
        )

      case 'there':
        return (
          <div className="text-center py-20">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">THERE - Narrative Atlas</h1>
              <p className="text-gray-600 text-lg">Interactive narrative map - explore stories worldwide</p>
            </div>
            <div className="max-w-2xl mx-auto">
              <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-lg">
                <div className="text-6xl mb-6">🗺️</div>
                <p className="text-gray-700 text-lg leading-relaxed">
                  Visualize narratives on an interactive world map.<br />
                  See how stories connect across geography.
                </p>
              </div>
            </div>
          </div>
        )

      case 'why':
        return (
          <div className="text-center py-20">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">WHY - Knowledge Graph</h1>
              <p className="text-gray-600 text-lg">Explore connections and contribute to understanding</p>
            </div>
            <div className="max-w-2xl mx-auto">
              <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-lg">
                <div className="text-6xl mb-6">🧠</div>
                <p className="text-gray-700 text-lg leading-relaxed">
                  Discover the relationships between events, people, and ideas.<br />
                  Contribute to collective understanding.
                </p>
              </div>
            </div>
          </div>
        )

      case 'when':
        return (
          <div className="text-center py-20">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">WHEN - Town Hall Calendar</h1>
              <p className="text-gray-600 text-lg">Scheduled discussions and live events</p>
            </div>
            <div className="max-w-2xl mx-auto">
              <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-lg">
                <div className="text-6xl mb-6">📅</div>
                <p className="text-gray-700 text-lg leading-relaxed">
                  Join live discussions and community events.<br />
                  Engage with experts and fellow citizens in real-time.
                </p>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 px-8 py-0 sticky top-0 z-40 flex-shrink-0">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">🗞️</div>
              <div className="text-xl font-bold text-gray-900">HERE.News</div>
              <div className="text-sm text-gray-600 font-medium italic ml-4">
                Truth Builds
              </div>
            </div>
          </div>
          <div className="flex">
            {[
              { key: 'here', label: 'HERE', icon: '🏠' },
              { key: 'there', label: 'THERE', icon: '🗺️' },
              { key: 'why', label: 'WHY', icon: '🧠' },
              { key: 'when', label: 'WHEN', icon: '📅' }
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center space-x-2 px-6 py-4 text-sm font-semibold transition-all duration-200 border-b-2 ${
                  activeTab === key
                    ? 'text-blue-600 border-blue-600 bg-blue-50'
                    : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <span className="text-lg">{icon}</span>
                <span className="uppercase tracking-wide">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-8 py-4 flex-shrink-0">
        <div className="text-center text-sm text-gray-600">
          <p className="italic">"The universe is made of stories, not of atoms" — Muriel Rukeyser</p>
          <p className="mt-2 text-xs text-gray-500">Coming Soon</p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
