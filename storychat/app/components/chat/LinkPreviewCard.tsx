import React from 'react'

interface LinkPreviewCardProps {
  url: string
  title?: string
  description?: string
  image?: string
  domain?: string
  taskId?: string
  status?: 'fetching' | 'processing' | 'completed' | 'matched' | 'failed'
  storyId?: string
  storyTitle?: string
  onViewStory?: () => void
}

function LinkPreviewCard({
  url,
  title,
  description,
  image,
  domain,
  taskId,
  status = 'fetching',
  storyId,
  storyTitle,
  onViewStory
}: LinkPreviewCardProps) {
  const statusConfig = {
    fetching: { icon: '⏳', label: 'Fetching preview...', color: 'bg-blue-50 border-blue-200' },
    processing: { icon: '⚙️', label: 'Processing', color: 'bg-yellow-50 border-yellow-200' },
    completed: { icon: '✅', label: 'Processed', color: 'bg-green-50 border-green-200' },
    matched: { icon: '🎯', label: 'Matched to story', color: 'bg-purple-50 border-purple-200' },
    failed: { icon: '❌', label: 'Failed', color: 'bg-red-50 border-red-200' }
  }

  const config = statusConfig[status]

  return (
    <div className={`border-2 rounded-xl overflow-hidden ${config.color} mb-2`}>
      {/* Preview Section */}
      {(image || title) && (
        <div className="bg-white">
          {image && (
            <img
              src={image}
              alt={title || 'Article preview'}
              className="w-full h-48 object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          )}
          <div className="p-3">
            {title && (
              <h4 className="font-semibold text-sm text-slate-900 mb-1 line-clamp-2">
                {title}
              </h4>
            )}
            {description && (
              <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                {description}
              </p>
            )}
            {domain && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {domain}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Status Section */}
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <div>
            <p className="text-xs font-semibold text-slate-700">{config.label}</p>
            {taskId && (
              <p className="text-[10px] text-slate-500 break-all">Task: {taskId}</p>
            )}
          </div>
        </div>

        {status === 'matched' && storyTitle && onViewStory && (
          <button
            onClick={onViewStory}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            View Story
          </button>
        )}
      </div>

      {/* Story Match Info */}
      {status === 'matched' && storyTitle && storyId && (
        <div className="px-3 pb-2">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 border-2 border-purple-200">
            <p className="text-[10px] text-purple-600 font-semibold mb-1 uppercase tracking-wide">✨ Matched to Story</p>
            <p className="text-sm text-slate-900 font-semibold mb-2 line-clamp-2">{storyTitle}</p>
            <a
              href={`/story/${storyId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {window.location.origin}/story/{storyId.slice(0, 8)}...
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default LinkPreviewCard
