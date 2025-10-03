import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './HomePage'
import ResultPage from './ResultPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/result/:taskId" element={<ResultPage />} />
      </Routes>
    </Router>
  )
}

export default App
