import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './HomePage'
import StoryPage from './StoryPage'

import ArchivePage from './ArchivePage'
import GraphPage from './GraphPage'

function App() {
  return (
    <Router basename="/app">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/story/:storyId" element={<StoryPage />} />
        <Route path="/story/:storyId/:slug" element={<StoryPage />} />
      </Routes>
    </Router>
  )
}

export default App
