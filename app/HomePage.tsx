import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

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
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (!url.trim()) {
      setSubmitStatus('Please enter a URL')
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
        },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

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
    <div className="flex h-screen bg-gray-100">
      {/* Left Pane - News List */}
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">News Feed</h1>
        <div className="space-y-4">
          {mockNews.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">{item.title}</h2>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{item.source}</span>
                <span>{item.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Pane - URL Submit Form */}
      <div className="w-96 bg-white p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Extract URL</h2>
        <div className="space-y-4">
          <input
            type="url"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter URL to extract..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isSubmitting}
          />
          <button
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-400"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
          {submitStatus && (
            <div className={`text-center p-2 rounded ${submitStatus.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
              {submitStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HomePage
