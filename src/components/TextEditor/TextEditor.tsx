import dynamic from 'next/dynamic'
import React, {
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'
import 'react-quill/dist/quill.snow.css'
import { ReactQuillProps } from 'react-quill'
import { Quill } from 'quill'

interface RQProps extends ReactQuillProps {
  forwardedRef: React.RefObject<any>
}

const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill')
    const Component = ({ forwardedRef, ...props }: RQProps) => (
      <RQ ref={forwardedRef} {...props} />
    )
    Component.displayName = 'ReactQuill'
    return Component
  },
  {
    ssr: false
  }
)

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
  const quillRef = useRef<any>(null)
  const quillRefLoading = useRef<boolean>(false)
  const pasteTimer = useRef()

  // const [quill, setQuill] = useState<any>(null)

  useEffect(() => {
    const element = document.getElementById('editor')
    console.log('first lement is >>', element)
    if (!element || quillRef.current || quillRefLoading.current)
      return

    quillRefLoading.current = true
    import('quill').then(module => {
      // setQuill(module.default)
      import('./PlainClipboard').then(pc => {
        const PlainClipboard = pc.default
        module.default.register(
          'modules/clipboard',
          PlainClipboard,
          true
        )

        var toolbarOptions = [
          ['bold', 'italic', 'underline', 'strike'], // toggled buttons
          ['blockquote', 'code-block'],

          [{ header: 1 }, { header: 2 }], // custom button values
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ script: 'sub' }, { script: 'super' }], // superscript/subscript
          [{ indent: '-1' }, { indent: '+1' }], // outdent/indent
          [{ direction: 'rtl' }], // text direction

          [{ size: ['small', false, 'large', 'huge'] }], // custom dropdown
          [{ header: [1, 2, 3, 4, 5, 6, false] }],

          [{ color: [] }, { background: [] }], // dropdown with defaults from theme
          [{ font: [] }],
          [{ align: [] }],

          ['clean'] // remove formatting button
        ]

        const quill = new module.default(element, {
          placeholder: placeholder ? placeholder : '',
          modules: {
            toolbar: toolbarOptions
          },

          theme: 'snow'
        })
        quillRef.current = quill
      })
    })
  }, [placeholder])

  console.log('quill is >>', quillRef.current)

  // const [modules, setModules] = useState<{
  //   clipboard: { matchVisual: boolean; module: any }
  // } | null>(null)

  // useEffect(() => {
  //   import('./PlainClipboard').then(module => {
  //     const PlainClipboard = module.default
  //     setModules({
  //       clipboard: {
  //         matchVisual: false,
  //         module: PlainClipboard
  //       }
  //     })
  //   })
  // }, [])

  const handleQuillChange = (value: string) => {
    handleChange(value)
  }

  // function handlePaste(event: ClipboardEvent) {
  //   // handle the paste event here
  //   console.log('Paste event triggered')
  //   console.log(
  //     'clipboard datat is >>',
  //     event.clipboardData?.getData('text/plain')
  //   )
  // }
  // const addPasteEvent = useCallback(() => {
  //   setTimeout(() => {
  //     const item = document.querySelector(
  //       '#text_editor  div.ql-editor'
  //     ) as HTMLDivElement
  //     if (item) item.addEventListener('paste', handlePaste)
  //     else addPasteEvent()
  //   }, 1000)
  // }, [])

  // useEffect(() => {
  //   const item = document.querySelector(
  //     '#text_editor  div.ql-editor'
  //   ) as HTMLDivElement
  //   console.log('FIRST outer item is >>', item)
  //   if (item) item.addEventListener('paste', handlePaste)
  //   else addPasteEvent()
  //   return () => {
  //     if (item) item.removeEventListener('paste', handlePaste)
  //   }
  // }, [addPasteEvent])

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'v' && e.metaKey) {
      // e.preventDefault()
    }
  }

  // if (!modules) {
  //   return <div>Loading modules...</div>
  // }

  return (
    <div className={containerClassName}>
      <div id='editor' />
      {/* {console.log('modules are >>', modules)} */}
      {/* <ReactQuill
        forwardedRef={quillRef}
        theme='snow'
        value={html}
        onChange={handleQuillChange}
        placeholder={placeholder ? placeholder : ''}
        style={{
          background: 'white',
          ...style
        }}
        modules={modules}
        id='text_editor'
        // onKeyDown={handleKeyDown}
      /> */}
    </div>
  )
}

export default TextEditor
