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
  isEdit?: boolean
  containerClassName?: string
  placeholder?: string
  handlePreviewData: (data?: ILinkDetails) => void
  canResetPreview: boolean
  toggleResetPreview: () => void
  toggleDisablePost: (state: boolean) => void
  customEditorId: string
  prevPreview?: {
    url: string
    favicons?: string[] | undefined
    siteName?: string | undefined
    images?: string[] | undefined
    title?: string | undefined
    description?: string | undefined
  }
  prevText?: string
}

const TextEditor = forwardRef(
  (
    {
      isEdit,
      containerClassName,
      placeholder,
      handlePreviewData,
      canResetPreview,
      toggleResetPreview,
      toggleDisablePost,
      customEditorId,
      prevPreview,
      prevText
    }: TextEditorProps,
    ref: any
  ) => {
    const quillRefLoading = useRef<boolean>(false)
    const pasteTimer = useRef(false)

    const [isQuillReady, setIsQuillReady] = useState(false)
    const [showLinkPreview, setShowLinkPreview] = useState(false)
    const [link, setLink] = useState('')

    const resetLinkPreview = () => setLink('')
    const toggleLinkPreview = (previewState: boolean) => {
      setShowLinkPreview(previewState)
    }

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
      const element = document.getElementById(
        customEditorId ? customEditorId : 'editor'
      )
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
          setIsQuillReady(true)
        })
      })
    }, [placeholder, getPreviewOnLinkFound, ref, customEditorId])

    useEffect(() => {
      if (isQuillReady && isEdit) {
        ref.current.root.className =
          ref.current.root.className + ' max-h-[40vh]'
        if (prevText) {
          ref.current.root.innerHTML = prevText
        }
      }
    }, [isQuillReady, prevText, isEdit, ref])

    useEffect(() => {
      if (prevPreview && prevPreview.url) {
        toggleLinkPreview(true)
      }
    }, [prevPreview])

    return (
      <div
        className={`${containerClassName ? containerClassName : ''}`}
        id='quill-container'
      >
        <div id={customEditorId ? customEditorId : 'editor'} />
        <LinkDetails
          prevPreview={prevPreview}
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
