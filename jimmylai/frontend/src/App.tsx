import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './components/HomePage'
import CreateQuestWizard from './components/CreateQuestWizard'
import QuestDetailPage from './components/QuestDetailPage'
import TruthRaceUX2 from './components/TruthRaceUX2'
import TruthRace from './components/TruthRace'
// import LiveFeed from './components/LiveFeed'  // Simple feed
// import TruthMarketPrototype from './TruthMarket'  // Old complex version

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="/app" element={<HomePage />} />
        <Route path="/create-quest" element={<CreateQuestWizard />} />
        <Route path="/quest/:questId" element={<QuestDetailPage />} />
        <Route path="/legacy" element={<TruthRace />} />
        <Route path="/ux2" element={<TruthRaceUX2 />} />
      </Routes>
    </BrowserRouter>
  )
}

