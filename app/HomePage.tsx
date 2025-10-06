import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ensureUserId, formatUserId, persistUserId } from './userSession'
import UserProfile from './UserProfile'
import logoAsset from './assets/here_pin_logo.svg'

interface NewsItem {
  id: number
  title: string
  source: string
  timestamp: string
}

const mockNews: NewsItem[] = [
  { id: 1, title: "Breaking: New Technology Advancement Announced", source: "Tech News", timestamp: "2h ago" },
  { id: 2, title: "Global Markets Rally on Economic Data", source: "Finance Daily", timestamp: "4h ago" },
  { id: 3, title: "Scientists Discover Novel Treatment Approach", source: "Science Weekly", timestamp: "6h ago" },
  { id: 4, title: "Political Leaders Meet for Climate Summit", source: "World News", timestamp: "8h ago" },
  { id: 5, title: "Sports Team Wins Championship Title", source: "Sports Network", timestamp: "10h ago" },
]

function HomePage() {
  const [url, setUrl] = useState('')
  const [submitStatus, setSubmitStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userId, setUserId] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const id = ensureUserId()
    setUserId(id)
  }, [])

  const handleSubmit = async () => {
    if (!url.trim()) {
      setSubmitStatus('Please enter a URL')
      setTimeout(() => setSubmitStatus(''), 3000)
      return
    }

    if (!userId) {
      setSubmitStatus('Preparing user session, please try again')
      setTimeout(() => setSubmitStatus(''), 3000)
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('Submitting...')

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({ url, user_id: userId }),
      })

      const data = await response.json()

      if (data.user_id && data.user_id !== userId) {
        persistUserId(data.user_id)
        setUserId(data.user_id)
      }

      if (data.task_id) {
        // Redirect to result page with task_id
        navigate(`/result/${data.task_id}`)
      } else {
        setSubmitStatus('Error: No task ID returned')
        setIsSubmitting(false)
        setTimeout(() => setSubmitStatus(''), 3000)
      }
    } catch (error) {
      setSubmitStatus('Error submitting URL')
      setIsSubmitting(false)
      setTimeout(() => setSubmitStatus(''), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative h-14 sm:h-16">
            <img
              src={logoAsset}
              alt="Here Pin Logo"
              className="h-full w-auto drop-shadow-sm"
            />
          </div>
          <div className="self-start sm:self-auto">
            <UserProfile userId={userId} />
          </div>
        </header>

        <main className="mt-10 grid gap-10 lg:grid-cols-[2fr_1fr]">
          <section className="space-y-6">
            <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-800">Live Story Signals</h2>
                  <p className="text-sm text-slate-500">
                    Quick scan of what's trending across monitored domains.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {mockNews.map((item) => (
                  <article
                    key={item.id}
                    className="group rounded-2xl border border-slate-200 bg-white/90 p-5 transition shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {item.source}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                        {item.timestamp}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <aside className="lg:sticky lg:top-10">
            <div className="bg-white border border-white/60 rounded-3xl shadow-md p-6">
              <h2 className="text-xl font-semibold text-slate-800">Start a Trace</h2>
              <p className="text-sm text-slate-500 mt-1">
                Drop a URL to extract the story, validate the content, and semantize claims.
              </p>

              <div className="mt-6 space-y-4">
                <input
                  type="url"
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Paste a link to investigate..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isSubmitting}
                />
                <button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition disabled:bg-slate-300 disabled:text-slate-500"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !userId}
                >
                  {isSubmitting ? 'Submitting...' : 'Launch Extraction'}
                </button>
                {submitStatus && (
                  <div className={`text-center text-sm p-3 rounded-xl ${submitStatus.includes('Error') ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                    {submitStatus}
                  </div>
                )}
              </div>

              <div className="mt-6 text-xs text-slate-400 space-y-1">
                <div>• Clean & valid content unlocks semantization.</div>
                <div>• Track token usage per stage in the task view.</div>
                <div>• Sessions persist locally for continuity.</div>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  )
}

export default HomePage
