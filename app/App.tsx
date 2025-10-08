import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
// import HomePage from './HomePage'  // Old chat-based homepage
import SimplifiedHome from './SimplifiedHome'
import ResultPage from './ResultPage'
import StoryPage from './StoryPage'
import BuildPage from './BuildPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SimplifiedHome />} />
        <Route path="/result/:taskId" element={<ResultPage />} />
        <Route path="/story/:id" element={<StoryPage />} />
        <Route path="/build/:id" element={<BuildPage />} />
      </Routes>
    </Router>
  )
}

export default App
