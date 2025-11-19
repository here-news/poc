import React from 'react'

interface StoryContentProps {
  content: string
}

function StoryContent({ content }: StoryContentProps) {
  // Parse content to render citations and entity links
  const renderContent = () => {
    // Replace [[Entity Name]] or [[Entity Name|id]] with links
    let parsed = content.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, name, id) => {
      const entityId = id || name
      return `<span class="entity-link" data-entity-id="${entityId}">${name}</span>`
    })

    // Replace {{cite:xxx}} with citation markers
    parsed = parsed.replace(/\{\{cite:([^}]+)\}\}/g, (_match, citationId) => {
      return `<sup class="citation-marker" data-citation-id="${citationId}">[cite]</sup>`
    })

    // Split by paragraphs
    const paragraphs = parsed.split('\n\n').filter(p => p.trim())

    return paragraphs.map((paragraph, index) => (
      <p
        key={index}
        className="mb-4 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: paragraph }}
      />
    ))
  }

  return (
    <div className="prose max-w-none">
      <style dangerouslySetInnerHTML={{
        __html: `
          .entity-link {
            color: #4f46e5;
            font-weight: 500;
            cursor: pointer;
            text-decoration: none;
            border-bottom: 1px dashed #4f46e5;
          }
          .entity-link:hover {
            color: #6366f1;
            background-color: #eef2ff;
          }
          .citation-marker {
            color: #6366f1;
            font-size: 0.75em;
            font-weight: 600;
            margin-left: 0.1em;
            cursor: pointer;
          }
          .citation-marker:hover {
            text-decoration: underline;
          }
        `
      }} />
      {renderContent()}
    </div>
  )
}

export default StoryContent
