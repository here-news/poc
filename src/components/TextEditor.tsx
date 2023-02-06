import dynamic from 'next/dynamic'
import React, { useState } from 'react'
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css'
import { EditorState, Modifier } from 'draft-js'
// const EditorState = dynamic(
//     () => import('draft-js'),
//     { ssr: false }
//   )

const ReactDraftEditor = dynamic(
  () => import('react-draft-wysiwyg').then(mod => mod.Editor),
  { ssr: false }
)

interface CustomToolbarProps {
  onChange?: (editorState: EditorState) => void
  editorState?: EditorState
}

const CustomToolbar = (props: CustomToolbarProps) => {
  const addStar = (): void => {
    const { editorState, onChange } = props
    if (!editorState || !onChange) return

    const contentState = Modifier.replaceText(
      editorState.getCurrentContent(),
      editorState.getSelection(),
      '⭐',
      editorState.getCurrentInlineStyle()
    )
    onChange(
      EditorState.push(editorState, contentState, 'insert-characters')
    )
  }

  return <div onClick={addStar}>⭐</div>
}

function TextEditor() {
  const [editorState, setEditorState] = useState(
    EditorState.createEmpty()
  )

  const onEditorStateChange = (editorState: EditorState) => {
    setEditorState(editorState)
  }

  return (
    <div>
      <ReactDraftEditor
        toolbar={{
          options: ['inline', 'fontSize', 'list'],
          inline: {
            inDropdown: false,
            className: undefined,
            component: undefined,
            dropdownClassName: undefined,
            options: ['bold', 'italic', 'underline', 'strikethrough']
          },
          list: {
            inDropdown: false,
            className: undefined,
            component: undefined,
            dropdownClassName: undefined,
            options: ['unordered', 'ordered', 'indent', 'outdent']
          }
        }}
        editorState={editorState}
        wrapperClassName='demo-wrapper'
        editorClassName='demo-editor'
        onEditorStateChange={onEditorStateChange}
        toolbarCustomButtons={[<CustomToolbar key={1} />]}
      />
    </div>
  )
}

export default TextEditor
