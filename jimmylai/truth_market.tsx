import React, { useState } from 'react';
import { Camera, TrendingUp, Clock, Users, DollarSign, FileText, CheckCircle, AlertCircle, Award } from 'lucide-react';

const TruthMarketPrototype = () => {
  const [view, setView] = useState('home'); // 'home', 'ask-detail', 'answer-submit', 'receipt'
  const [userCredits, setUserCredits] = useState(100);
  const [selectedAsk, setSelectedAsk] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  // Mock data for Asks
  const asks = [
    {
      id: 1,
      question: "Did Trump raise Jimmy Lai with Xi during their October meeting?",
      clarity: 42,
      bounty: 45,
      timeLeft: "1d 6h",
      followers: 18,
      story: "Jimmy Lai / Trump / Xi Summit",
      answers: [
        { id: 1, clarityGain: 18, source: "EWTN tweet", novelty: "High", validated: true },
        { id: 2, clarityGain: 12, source: "Forbes video", novelty: "High", validated: true },
        { id: 3, clarityGain: 6, source: "Lianhe Zaobao", novelty: "Medium", validated: true }
      ]
    },
    {
      id: 2,
      question: "Did the CrowdStrike outage impact government services?",
      clarity: 36,
      bounty: 30,
      timeLeft: "18h",
      followers: 12,
      story: "Infrastructure Outages",
      answers: [
        { id: 1, clarityGain: 15, source: "AWS Status Page", novelty: "High", validated: true }
      ]
    },
    {
      id: 3,
      question: "What was the root cause of the White House ballroom cost increase?",
      clarity: 28,
      bounty: 25,
      timeLeft: "2d 4h",
      followers: 8,
      story: "White House Renovation",
      answers: []
    }
  ];

  const handleFundAsk = (askId, amount) => {
    if (userCredits >= amount) {
      setUserCredits(userCredits - amount);
      // Update ask bounty (in real app)
      alert(`Funded ${amount} credits to the ask!`);
    }
  };

  const handleSubmitAnswer = () => {
    if (answerText && sourceUrl) {
      setView('receipt');
      setAnswerText('');
      setSourceUrl('');
    }
  };

  // Home View
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">H</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Race to Truth</h1>
                  <p className="text-xs text-slate-500">HERE.news Truth Market</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-blue-900">{userCredits} credits</span>
                </div>
                <button className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors">
                  Sign in
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Two-Lane CTAs */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-8 text-white shadow-lg">
              <h2 className="text-2xl font-bold mb-2">I want to know...</h2>
              <p className="text-blue-100 mb-4">Create or join an Ask to resolve questions</p>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ask the truth: Did Trump raise Jimmy Lai with Xi?"
                  className="w-full px-4 py-3 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-300 focus:outline-none"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium">
                  Ask
                </button>
              </div>
              <div className="mt-3 text-blue-100 text-xs">
                Keep it specific. Add scope to improve matching.
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-8 text-white shadow-lg">
              <h2 className="text-2xl font-bold mb-2">I know...</h2>
              <p className="text-purple-100 mb-4">Share evidence with sources to earn credits</p>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Paste source URL or upload evidence..."
                  className="w-full px-4 py-3 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-purple-300 focus:outline-none"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium">
                  Share
                </button>
              </div>
              <div className="mt-3 text-purple-100 text-xs">
                System extracts claims and matches to existing Asks.
              </div>
            </div>
          </div>

          {/* Trending Races */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <h3 className="text-xl font-bold text-slate-900">Trending Races</h3>
              <span className="text-sm text-slate-500">(by Resonance Index)</span>
            </div>

            <div className="space-y-4">
              {asks.map(ask => (
                <div 
                  key={ask.id}
                  onClick={() => {
                    setSelectedAsk(ask);
                    setView('ask-detail');
                  }}
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer border border-slate-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-lg font-semibold text-slate-900 flex-1 pr-4">
                      {ask.question}
                    </h4>
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-sm font-medium">
                      <Clock className="w-4 h-4" />
                      {ask.timeLeft}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-slate-600 mb-4">
                    <div className="flex items-center gap-1">
                      <div className="w-full bg-slate-200 rounded-full h-2 max-w-[120px]">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                          style={{ width: `${ask.clarity}%` }}
                        />
                      </div>
                      <span className="font-medium">Clarity: {ask.clarity}/100</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-medium">{ask.bounty} credits</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{ask.followers} followers</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                      Linked Story: <span className="text-blue-600">{ask.story}</span>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
                        Join Race
                      </button>
                      <button className="px-4 py-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium">
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Resolved Truths */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-green-500" />
              <h3 className="text-xl font-bold text-slate-900">Top Resolved Truths</h3>
            </div>

            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="font-semibold text-slate-900">Clarity → 72%</span>
                    </div>
                    <p className="text-sm text-slate-600">Trump raised Jimmy Lai with Xi (5 sources)</p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View Receipt
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-amber-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                      <span className="font-semibold text-slate-900">Clarity → 44%</span>
                    </div>
                    <p className="text-sm text-slate-600">AWS outage root cause confirmed</p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Ask Detail View
  if (view === 'ask-detail' && selectedAsk) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <button 
              onClick={() => setView('home')}
              className="text-blue-600 hover:text-blue-700 mb-2 text-sm font-medium"
            >
              ← Back to Races
            </button>
            <h1 className="text-2xl font-bold text-slate-900">{selectedAsk.question}</h1>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Ask Header */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                Story: {selectedAsk.story}
              </span>
              <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                Entity: Donald Trump
              </span>
              <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                Entity: Jimmy Lai
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <div className="text-sm text-slate-500 mb-1">Clarity</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                      style={{ width: `${selectedAsk.clarity}%` }}
                    />
                  </div>
                  <span className="font-bold text-slate-900">{selectedAsk.clarity}/100</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">(was 28)</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">Bounty</div>
                <div className="text-2xl font-bold text-slate-900">{selectedAsk.bounty} credits</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">Time left</div>
                <div className="text-2xl font-bold text-amber-600">{selectedAsk.timeLeft}</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => handleFundAsk(selectedAsk.id, 10)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Fund +10
              </button>
              <button 
                onClick={() => handleFundAsk(selectedAsk.id, 20)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Fund +20
              </button>
              <button 
                onClick={() => setView('answer-submit')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Submit Answer
              </button>
              <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                Follow
              </button>
            </div>
          </div>

          {/* Answers */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Answers (ranked by ΔClarity)
            </h3>

            <div className="space-y-4">
              {selectedAsk.answers.map((answer, idx) => (
                <div key={answer.id} className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl font-bold text-blue-600">#{idx + 1}</div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">+{answer.clarityGain}</div>
                        <div className="text-sm text-slate-500">Clarity gain</div>
                      </div>
                    </div>
                    {answer.validated && (
                      <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Validated
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">Source:</span>
                      <span className="text-blue-600 font-medium">{answer.source}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">Novelty:</span>
                        <span className={`font-medium ${answer.novelty === 'High' ? 'text-green-600' : 'text-amber-600'}`}>
                          {answer.novelty}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">Timeliness:</span>
                        <span className="font-medium text-blue-600">Early</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      View claims
                    </button>
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      Open source
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {selectedAsk.answers.length === 0 && (
              <div className="bg-slate-50 rounded-lg p-8 text-center border-2 border-dashed border-slate-300">
                <p className="text-slate-600 mb-4">No answers yet — stake your evidence and make clarity happen</p>
                <button 
                  onClick={() => setView('answer-submit')}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Be the First to Answer
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-slate-700">
              <strong>Resolution rule:</strong> Resolves at Clarity ≥ 70 or on deadline
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Answer Submit View
  if (view === 'answer-submit') {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <button 
              onClick={() => setView('ask-detail')}
              className="text-blue-600 hover:text-blue-700 mb-2 text-sm font-medium"
            >
              ← Back to Ask
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Submit Answer</h1>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Source URL or Upload
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://example.com/article..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Paste a URL or use the upload button for documents
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Synopsis (optional)
              </label>
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Brief summary of what this source reveals..."
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {sourceUrl && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">Extracted claims (preview):</h4>
                <ul className="space-y-1 text-sm text-green-800">
                  <li>• "WH official confirmed Trump raised Jimmy Lai with Xi."</li>
                  <li>• Quote: 'He wants to see that happen.'</li>
                  <li>• "EWTN reporter Owen Jensen posted on Oct 26."</li>
                </ul>
                <button className="mt-3 text-green-700 hover:text-green-800 text-sm font-medium">
                  Edit claims
                </button>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Match Ask
              </label>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900 font-medium">
                  {selectedAsk?.question}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm text-slate-700">
                  Stake 2 credits (returned if validated, forfeited if rejected)
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSubmitAnswer}
                disabled={!sourceUrl}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Answer
              </button>
              <button
                onClick={() => setView('ask-detail')}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-900">
              <strong>ΔClarity preview:</strong> Your answer is estimated to increase clarity by +0.15 to +0.20 based on novelty and source quality.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Receipt View
  if (view === 'receipt') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-green-200">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Truth Achieved</h1>
              <p className="text-lg text-slate-600">Clarity → 72%</p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between py-3 border-b border-slate-200">
                <span className="text-slate-600">Ask:</span>
                <span className="font-medium text-slate-900 text-right max-w-md">
                  {selectedAsk?.question}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-200">
                <span className="text-slate-600">Scope:</span>
                <span className="font-medium text-slate-900">Story: Jimmy Lai / Trump / Xi</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-200">
                <span className="text-slate-600">Resolution:</span>
                <span className="font-medium text-slate-900">2025-10-28</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-200">
                <span className="text-slate-600">Bounty:</span>
                <span className="font-medium text-slate-900">45 credits</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-slate-600">Followers:</span>
                <span className="font-medium text-slate-900">18</span>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="font-bold text-slate-900 mb-4">Clarity Trajectory</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">Start 28</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-slate-600">Answer #3 +6</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-slate-600">Answer #2 +12</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-slate-600">Answer #1 +18</span>
                  <span className="text-slate-400">→</span>
                  <span className="font-bold text-green-600">Final 72</span>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="font-bold text-slate-900 mb-4">Sources (5)</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="text-slate-700">EWTN tweet (WH official confirmation)</span>
                  <button className="text-blue-600 hover:text-blue-700 ml-auto">Open</button>
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="text-slate-700">Forbes video clip</span>
                  <button className="text-blue-600 hover:text-blue-700 ml-auto">Open</button>
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="text-slate-700">Lianhe Zaobao article (zh)</span>
                  <button className="text-blue-600 hover:text-blue-700 ml-auto">Open</button>
                </li>
              </ul>
            </div>

            <div className="mb-8">
              <h3 className="font-bold text-slate-900 mb-4">Payouts</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-green-700">#1 +18</span>
                    <span className="text-slate-700">@builder_a</span>
                  </div>
                  <span className="font-bold text-green-700">22 credits (48%)</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-green-600">#2 +12</span>
                    <span className="text-slate-700">@builder_b</span>
                  </div>
                  <span className="font-bold text-green-600">15 credits (33%)</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-emerald-600">#3 +6</span>
                    <span className="text-slate-700">@builder_c (You!)</span>
                  </div>
                  <span className="font-bold text-emerald-600">8 credits (19%)</span>
                </div>
              </div>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg mb-6">
              <p className="text-sm text-blue-900 font-medium">
                "You helped raise this story's clarity. If live, this would be worth $1000."
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setUserCredits(userCredits + 8);
                  setView('home');
                }}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Claim 8 Credits
              </button>
              <button 
                onClick={() => setView('home')}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
              >
                View Story
              </button>
            </div>

            <div className="mt-6 flex justify-center gap-4">
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Copy link
              </button>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Share on X
              </button>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Email
              </button>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-slate-600 mb-4">Story Badge: Resolved by Truth #007</p>
            <button 
              onClick={() => setView('home')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Truth Market
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default TruthMarketPrototype;