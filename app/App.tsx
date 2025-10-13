import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './LandingPage'
import SimplifiedHome from './SimplifiedHome'
import ResultPage from './ResultPage'
import StoryPage from './StoryPage'
import BuildPage from './BuildPage'
import EntityPage from './EntityPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<SimplifiedHome />} />
        <Route path="/result/:taskId" element={<ResultPage />} />
        <Route path="/story/:id" element={<StoryPage />} />
        <Route path="/build/:id" element={<BuildPage />} />
        <Route path="/people/:id/:name?" element={<EntityPage />} />
        <Route path="/organizations/:id/:name?" element={<EntityPage />} />
        <Route path="/locations/:id/:name?" element={<EntityPage />} />
      </Routes>
    </Router>
  )
}

export default App
