import React, { useEffect, useState } from 'react'
import { ensureUserId } from './userSession'
import { useChatSession } from './hooks/useChatSession'
import Header from './components/layout/Header'
import LiveSignals from './components/layout/LiveSignals'
import ChatWindow from './components/chat/ChatWindow'

function HomePage() {
  const [userId, setUserId] = useState('')

  useEffect(() => {
    const id = ensureUserId()
    setUserId(id)
  }, [])

  const {
    messages,
    isTyping,
    typingMessage,
    submitMessage,
    handleAction,
    handleJoinStory,
    handleViewStory
  } = useChatSession(userId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Header userId={userId} />

        <main className="mt-10 grid gap-10 lg:grid-cols-[2fr_1fr]">
          <LiveSignals />

          <aside className="lg:sticky lg:top-10 h-[calc(100vh-8rem)]">
            <ChatWindow
              messages={messages}
              isTyping={isTyping}
              typingMessage={typingMessage}
              onSubmit={submitMessage}
              onAction={handleAction}
              onJoinStory={handleJoinStory}
              onViewStory={handleViewStory}
              disabled={!userId}
            />
          </aside>
        </main>
      </div>
    </div>
  )
}

export default HomePage
