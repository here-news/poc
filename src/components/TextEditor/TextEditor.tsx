import dynamic from 'next/dynamic'
import React, { useState } from 'react'
import 'react-quill/dist/quill.snow.css'

const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false
})

interface TextEditorProps {
  html: string
  handleChange: (value: string) => void
  containerClassName?: string
  style?: React.CSSProperties
  placeholder?: string
}

function TextEditor({
  html,
  handleChange,
  containerClassName,
  style,
  placeholder
}: TextEditorProps) {
  const handleQuillChange = (value: string) => {
    import('sanitize-html').then(async func => {
      const sanitizedHTML = func.default(value)
      handleChange(sanitizedHTML)
    })
  }
  return (
    <div className={containerClassName}>
      <ReactQuill
        theme='snow'
        value={html}
        onChange={handleQuillChange}
        placeholder={placeholder ? placeholder : ''}
        style={{
          background: 'white',
          ...style
        }}
      />
    </div>
  )
}

export default TextEditor
