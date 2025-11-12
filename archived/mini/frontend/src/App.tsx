import React, { useEffect, useState } from 'react'

export default function App() {
  const [message, setMessage] = useState<string>('Loading...')

  useEffect(() => {
    fetch('/api/hello')
      .then((r) => r.json())
      .then((data) => setMessage(`${data.message} (status: ${data.status})`))
      .catch(() => setMessage('Failed to reach backend'))
  }, [])

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
      padding: '2rem',
      lineHeight: 1.4
    }}>
      <h1>Mini Experiment</h1>
      <p>This is a minimal React + TSX app bundled with Vite and served by a FastAPI container.</p>
      <p><strong>Backend says:</strong> {message}</p>

      <hr />
      <p>
        Try editing <code>mini/frontend/src/App.tsx</code> and rebuild to see changes.
      </p>
    </div>
  )
}

