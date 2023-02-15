import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'
import 'quill/dist/quill.snow.css'
import LinkDetails from './LinkDetails'
import { ILinkDetails } from 'types/interfaces'

interface TextEditorProps {
  containerClassName?: string
  placeholder?: string
  handlePreviewData: (data?: ILinkDetails) => void
  canResetPreview: boolean
  toggleResetPreview: () => void
  toggleDisablePost: (state: boolean) => void
}

const TextEditor = forwardRef(
  (
    {
      containerClassName,
      placeholder,
      handlePreviewData,
      canResetPreview,
      toggleResetPreview,
      toggleDisablePost
    }: TextEditorProps,
    ref: any
  ) => {
    const quillRef = useRef<any>(null)
    const quillRefLoading = useRef<boolean>(false)
    const pasteTimer = useRef(false)

    const [showLinkPreview, setShowLinkPreview] = useState(false)
    const [link, setLink] = useState('')

    const resetLinkPreview = () => setLink('')
    const toggleLinkPreview = (previewState: boolean) =>
      setShowLinkPreview(previewState)

    useEffect(() => {
      if (canResetPreview) {
        resetLinkPreview()
        toggleLinkPreview(false)
        toggleResetPreview()
      }
    }, [canResetPreview, toggleResetPreview])

    const getPreviewOnLinkFound = useCallback(
      (urlLink: string) => {
        if (showLinkPreview) return
        setLink(urlLink)
        pasteTimer.current = true
        setShowLinkPreview(true)
      },
      [showLinkPreview]
    )

    useEffect(() => {
      const element = document.getElementById('editor')
      if (!element || ref.current || quillRefLoading.current) return

      quillRefLoading.current = true
      import('quill').then(module => {
        import('./PlainClipboard').then(pc => {
          const PlainClipboard = pc.default

          module.default.register(
            'modules/clipboard',
            PlainClipboard,
            true
          )

          const quill = new module.default(element, {
            placeholder: placeholder ? placeholder : '',
            modules: {
              toolbar: {
                link: function (value: string) {
                  if (value) {
                    var href = prompt('Enter the URL')
                    this.quill.format('link', href)
                  } else {
                    this.quill.format('link', false)
                  }
                }
              },
              clipboard: {
                module: PlainClipboard,
                getPreviewOnLinkFound: getPreviewOnLinkFound
              }
            },

            theme: 'snow'
          })

          ref.current = quill
        })
      })
    }, [placeholder, getPreviewOnLinkFound, ref])

    return (
      <div
        className={`${containerClassName ? containerClassName : ''}`}
        id='quill-container'
      >
        <div id='editor' />
        <LinkDetails
          link={link}
          isVisible={showLinkPreview}
          toggleVisible={toggleLinkPreview}
          resetLinkPreview={resetLinkPreview}
          handlePreviewData={handlePreviewData}
          toggleDisablePost={toggleDisablePost}
        />
      </div>
    )
  }
)

TextEditor.displayName = 'TextEditor'

export default TextEditor
