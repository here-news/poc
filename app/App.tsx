import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './LandingPage'
import SimplifiedHome from './SimplifiedHome'
import ResultPage from './ResultPage'
import StoryPage from './StoryPage'
import BuildPage from './BuildPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<SimplifiedHome />} />
        <Route path="/result/:taskId" element={<ResultPage />} />
        <Route path="/story/:id" element={<StoryPage />} />
        <Route path="/build/:id" element={<BuildPage />} />
      </Routes>
    </Router>
  )
}

export default App
