import React from 'react'
import { URLPreview } from '../../types/chat'
import { extractDomain } from '../../utils/inputParser'

interface PreviewCardProps {
  preview: URLPreview
  isLoading?: boolean
}

function PreviewCard({ preview, isLoading = false }: PreviewCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white/90 overflow-hidden animate-pulse">
        <div className="h-24 bg-slate-200" />
        <div className="p-3 space-y-2">
          <div className="h-3 bg-slate-200 rounded w-3/4" />
          <div className="h-2 bg-slate-200 rounded w-1/2" />
        </div>
      </div>
    )
  }

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-slate-200 bg-white/90 overflow-hidden hover:shadow-md transition-shadow group"
    >
      <div className="flex gap-3 p-3">
        {preview.thumbnail && (
          <div className="flex-shrink-0 w-20 h-20 bg-slate-100 rounded-lg overflow-hidden">
            <img
              src={preview.thumbnail}
              alt={preview.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
            {preview.title}
          </h3>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            {preview.favicon && (
              <img
                src={preview.favicon}
                alt=""
                className="w-3 h-3"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            )}
            <span className="font-medium truncate">
              {preview.siteName || extractDomain(preview.url)}
            </span>
            {preview.author && (
              <>
                <span className="text-slate-300">•</span>
                <span className="truncate">{preview.author}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </a>
  )
}

export default PreviewCard
