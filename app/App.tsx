import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './LandingPage'
import SimplifiedHome from './SimplifiedHome'
import ResultPage from './ResultPage'
import StoryChatPage from './StoryChatPage'
import StoryRouter from './StoryRouter'
import BuildPage from './BuildPage'
import BuilderPage from './BuilderPage'
import BuilderPageV2 from './BuilderPageV2'
import BuilderPageV3 from './BuilderPageV3'
import BuilderPageV4 from './BuilderPageV4'
import EntityPage from './EntityPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        {/* Chat-centric interface as default app */}
        <Route path="/app" element={<StoryChatPage />} />
        <Route path="/app/:storyId" element={<StoryChatPage />} />
        <Route path="/result/:taskId" element={<ResultPage />} />
        {/* Story routes - support view modes (chat/full) and optional SEO slugs */}
        <Route path="/story/:storyId" element={<StoryRouter />} />
        <Route path="/story/:storyId/:slug" element={<StoryRouter />} />
        {/* Legacy storychat routes - redirect to /story */}
        <Route path="/storychat" element={<StoryChatPage />} />
        <Route path="/storychat/:storyId" element={<StoryChatPage />} />
        {/* Legacy simplified home (keep for rollback) */}
        <Route path="/home-legacy" element={<SimplifiedHome />} />
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
