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
import YoutubePreview from './YoutubePreview'

interface TextEditorProps {
  isEdit?: boolean
  containerClassName?: string
  placeholder?: string
  handlePreviewData: (
    data?: ILinkDetails,
    setPreviousData?: boolean
  ) => void
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
    youtubeId?: string | undefined
  }
  prevText?: string
  previewData: ILinkDetails | null
  previewType: 'compact' | 'detailed'
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
      prevText,
      previewData,
      previewType
    }: TextEditorProps,
    ref: any
  ) => {
    const quillRefLoading = useRef<boolean>(false)
    const pasteTimer = useRef(false)

    const [isQuillReady, setIsQuillReady] = useState(false)
    const [showLinkPreview, setShowLinkPreview] = useState(false)
    const [link, setLink] = useState('')
    const [youtubeVideo, setYoutubeVideo] = useState('')

    const resetLinkPreview = () => setLink('')
    const toggleLinkPreview = (previewState: boolean) => {
      setShowLinkPreview(previewState)
    }

    const getVideoPreview = useCallback(
      (youtubeId: any) => {
        if (youtubeVideo && youtubeVideo != '') return
        setYoutubeVideo(youtubeId)
      },
      [youtubeVideo]
    )

    useEffect(() => {
      if (canResetPreview) {
        resetLinkPreview()
        setYoutubeVideo('')
        toggleLinkPreview(false)
        toggleResetPreview()
      }
    }, [canResetPreview, toggleResetPreview])

    const removeVideo = useCallback(() => {
      setYoutubeVideo('')
      handlePreviewData(
        {
          youtubeId: ''
        } as ILinkDetails,
        true
      )
    }, [handlePreviewData])

    const getPreviewOnLinkFound = useCallback(
      (urlLink: string) => {
        if (showLinkPreview) return
        //remove youtube preview if any
        removeVideo()

        setLink(urlLink)
        pasteTimer.current = true
        setShowLinkPreview(true)
      },
      [showLinkPreview, removeVideo]
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
                    const href = prompt('Enter the URL')
                    this.quill.format('link', href)
                  } else {
                    this.quill.format('link', false)
                  }
                }
              },
              clipboard: {
                module: PlainClipboard,
                getPreviewOnLinkFound: getPreviewOnLinkFound,
                getVideoPreview: getVideoPreview
              }
            },
            formats: ['link-embed'],
            theme: 'snow'
          })

          ref.current = quill
          setIsQuillReady(true)
        })
      })
    }, [
      placeholder,
      getPreviewOnLinkFound,
      getVideoPreview,
      ref,
      customEditorId
    ])

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
      if (prevPreview) {
        prevPreview.youtubeId &&
          setYoutubeVideo(prevPreview.youtubeId)
        prevPreview.url && toggleLinkPreview(true)
      }
    }, [prevPreview])

    useEffect(() => {
      if (youtubeVideo && youtubeVideo !== '') {
        handlePreviewData({
          youtubeId: youtubeVideo
        } as ILinkDetails)
      }
    }, [handlePreviewData, youtubeVideo])

    return (
      <div
        className={`${containerClassName ? containerClassName : ''}`}
        id='quill-container'
      >
        <div id={customEditorId ? customEditorId : 'editor'} />

        {youtubeVideo && youtubeVideo !== '' ? (
          <YoutubePreview
            removeVideo={removeVideo}
            youtubeVideo={youtubeVideo}
          />
        ) : (
          (prevPreview || previewData || link) && (
            <LinkDetails
              prevPreview={prevPreview}
              previewData={previewData}
              link={link}
              isVisible={showLinkPreview}
              toggleVisible={toggleLinkPreview}
              resetLinkPreview={resetLinkPreview}
              handlePreviewData={handlePreviewData}
              toggleDisablePost={toggleDisablePost}
              type={previewType}
            />
          )
        )}
      </div>
    )
  }
)

TextEditor.displayName = 'TextEditor'

export default TextEditor
