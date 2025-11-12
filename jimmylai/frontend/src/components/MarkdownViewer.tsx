// @ts-nocheck
import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = {
  src: string
  className?: string
}

export default function MarkdownViewer({ src, className }: Props) {
  const [content, setContent] = useState<string>('Loading...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.text()
      })
      .then((txt) => { if (!cancelled) setContent(txt) })
      .catch((e) => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [src])

  if (error) {
    return <div className={`text-sm text-red-700 ${className || ''}`}>Failed to load markdown: {error}</div>
  }

  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        h1: (props) => <h1 className="text-2xl font-bold mb-4" {...props} />,
        h2: (props) => <h2 className="text-xl font-bold mt-6 mb-2" {...props} />,
        h3: (props) => <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />,
        p: (props) => <p className="mb-3 text-slate-800" {...props} />,
        ul: (props) => <ul className="list-disc ml-6 mb-3" {...props} />,
        ol: (props) => <ol className="list-decimal ml-6 mb-3" {...props} />,
        code: (props) => <code className="bg-slate-100 px-1 py-0.5 rounded" {...props} />,
        pre: (props) => <pre className="bg-slate-900 text-slate-100 p-3 rounded mb-3 overflow-auto text-xs" {...props} />,
        table: (props) => <table className="border border-slate-300 text-sm mb-3" {...props} />,
        th: (props) => <th className="border border-slate-300 p-2 bg-slate-50" {...props} />,
        td: (props) => <td className="border border-slate-300 p-2" {...props} />,
        a: (props) => <a className="text-blue-600 hover:text-blue-700 underline" target="_blank" {...props} />,
      }}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

