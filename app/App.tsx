import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './LandingPage'
import SimplifiedHome from './SimplifiedHome'
import ResultPage from './ResultPage'
import StoryChatPage from './StoryChatPage'
import BuildPage from './BuildPage'
import BuilderPage from './BuilderPage'
import BuilderPageV2 from './BuilderPageV2'
import BuilderPageV3 from './BuilderPageV3'
import BuilderPageV4 from './BuilderPageV4'
import EntityPage from './EntityPage'
// import StoryPageLegacy from './StoryPageLegacy' // Keep for rollback if needed

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<SimplifiedHome />} />
        <Route path="/result/:taskId" element={<ResultPage />} />
        {/* Chat-centric interface for stories */}
        <Route path="/story/:storyId" element={<StoryChatPage />} />
        <Route path="/storychat" element={<StoryChatPage />} />
        <Route path="/storychat/:storyId" element={<StoryChatPage />} />
        <Route path="/build/:id" element={<BuildPage />} />
        <Route path="/builder/:id" element={<BuilderPageV4 />} />
        <Route path="/builder-v3/:id" element={<BuilderPageV3 />} />
        <Route path="/builder-v2/:id" element={<BuilderPageV2 />} />
        <Route path="/builder-v1/:id" element={<BuilderPage />} />
        <Route path="/people/:id/:name?" element={<EntityPage />} />
        <Route path="/organizations/:id/:name?" element={<EntityPage />} />
        <Route path="/locations/:id/:name?" element={<EntityPage />} />
      </Routes>
    </Router>
  )
}

export default App
