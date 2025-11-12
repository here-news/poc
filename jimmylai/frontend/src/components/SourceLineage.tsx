// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { FileText, Video, FileAudio, MessageSquare, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react'

interface SourceLineageProps {
  askId: string
  answers: any[]
  storyId: string
  caseId: string
}

const SourceLineage: React.FC<SourceLineageProps> = ({ askId, answers, storyId, caseId }) => {
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSources()
  }, [answers])

  const fetchSources = async () => {
    try {
      const res = await fetch('/jimmylai/api/sources')
      const data = await res.json()
      setSources(data)
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch sources:', err)
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-500">Loading sources...</div>
  }

  // Build source tree from answers
  const sourceTree = answers.map(answer => {
    const answerSources = (answer.source_ids || []).map(sid =>
      sources.find(s => s.id === sid)
    ).filter(Boolean)

    return {
      answer,
      sources: answerSources
    }
  }).filter(item => item.sources.length > 0)

  if (sourceTree.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <div className="text-sm">No sources yet</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900">Source Lineage</h3>
        <div className="text-xs text-slate-500">
          {sourceTree.length} answer{sourceTree.length !== 1 ? 's' : ''} with sources
        </div>
      </div>

      {/* Tree visualization */}
      <div className="space-y-6">
        {sourceTree.map((item, idx) => (
          <div key={item.answer.id} className="relative">
            {/* Answer node */}
            <div className="bg-white border-2 border-slate-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-sm font-semibold text-slate-900">
                      Answer #{idx + 1}
                    </div>
                    <div className="text-green-600 font-bold text-sm">
                      +{item.answer.clarity_gain} ΔH
                    </div>
                    {item.answer.validated && (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  {item.answer.synopsis && (
                    <div className="text-sm text-slate-600 mb-3">
                      {item.answer.synopsis}
                    </div>
                  )}
                </div>
              </div>

              {/* Sources for this answer */}
              <div className="mt-3 pl-4 border-l-2 border-slate-200 space-y-3">
                {item.sources.map((source, sidx) => (
                  <div
                    key={source.id}
                    className={`bg-slate-50 rounded-lg p-3 border ${
                      source.type === 'primary'
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon based on modality */}
                      <div className={`mt-0.5 ${
                        source.type === 'primary' ? 'text-blue-600' : 'text-slate-400'
                      }`}>
                        {getModalityIcon(source.modality)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {source.title}
                          </div>
                          {source.type === 'primary' && (
                            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                              Primary
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                          <span className="capitalize">{source.modality}</span>
                          <span>•</span>
                          <span className="uppercase">{source.language}</span>
                          <span>•</span>
                          <span>{new Date(source.timestamp).toLocaleDateString()}</span>
                        </div>

                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {truncateUrl(source.url)}
                        </a>

                        {/* Status indicator */}
                        <div className="mt-2">
                          {source.status === 'reachable' && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Verified
                            </span>
                          )}
                          {source.status === 'pending' && (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Pending validation
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Connection line to next answer */}
            {idx < sourceTree.length - 1 && (
              <div className="absolute left-6 -bottom-3 w-0.5 h-6 bg-slate-200" />
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="text-xs font-semibold text-slate-700 mb-2">Legend</div>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span>Primary Source (direct evidence)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-slate-300 rounded" />
            <span>Secondary Source (reporting)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function getModalityIcon(modality: string) {
  switch (modality) {
    case 'video':
      return <Video className="w-5 h-5" />
    case 'transcript':
      return <FileAudio className="w-5 h-5" />
    case 'social_post':
      return <MessageSquare className="w-5 h-5" />
    default:
      return <FileText className="w-5 h-5" />
  }
}

function truncateUrl(url: string): string {
  if (url.length <= 50) return url
  return url.substring(0, 47) + '...'
}

export default SourceLineage
