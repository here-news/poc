import axios from 'axios'
import TextEditor from 'components/TextEditor/TextEditor'
import { ENV } from 'lib/env'
import Quill from 'quill'
import React, { useRef, useState } from 'react'
import { useMutation } from 'react-query'
import { toast } from 'react-toastify'
import FileUploadService from 'services/FileUploadService'
import { useAppSelector } from 'store/hooks'
import { ILinkDetails, IUploadedStatus } from 'types/interfaces'
import ImageUpload from './ImageUpload'

interface CreateReplyProps {
  postId: string
  handleReplySuccessCallback?: () => void
}

function CreateReply({
  postId,
  handleReplySuccessCallback
}: CreateReplyProps) {
  const editorRef = useRef<Quill | null>()
  const selectedAccount = useAppSelector(
    state => state.auth.selectedAccount
  )

  const [files, setFiles] = useState<FileList | null>(null)
  
  const [posted, setPosted] = useState(false)
  const [canResetPreview, setCanResetPreview] = useState(false)
  const [isDisablePost, setIsDisablePost] = useState(false)
  const [previewData, setPreviewData] = useState<ILinkDetails | null>(
    null
  )

  const toggleResetPreview = () => setCanResetPreview(prev => !prev)
  const toggleDisablePost = (state: boolean) =>
    setIsDisablePost(state)

  const handleFiles = (files: FileList | null) => {
    setFiles(files)
  }

  const handlePreviewData = (data?: ILinkDetails) => {
    if (data) setPreviewData(data)
    else setPreviewData(null)
  }

  const createPostReply = useMutation(
    (data: FormData) => {
      return axios.post(
        `${ENV.API_URL}/createPostReply/${postId}`,
        data
      )
    },
    {
      onSuccess: () => {
        if (editorRef.current) {
          editorRef.current.setText('')
        }
        setPreviewData(null)
        toggleResetPreview()

        setFiles(null)
        setPosted(true)
        handleReplySuccessCallback && handleReplySuccessCallback()
        setTimeout(() => {
          setPosted(false)
        }, 1000)

      },
      onError: () => {
        toast.error('There was some error create post!')
      }
    }
  )

  const handlePost = async (uploadedStatus : IUploadedStatus) => {
    const text = editorRef.current && editorRef.current.root.innerHTML

    if (posted) return
    if (!selectedAccount) return toast.error('Please log in!')
    const hasNoText =
      !text ||
      (text &&
        (text.trim() === '<p><br /></p>' ||
          text.trim() === '<p><br/></p>' ||
          text.trim() === '<p><br></p>' ||
          text.trim() === '<p><br ></p>'))
    if (!files && hasNoText)
      return toast.error('Please either enter some text or images!')

    const formData = new FormData()

    if (!hasNoText) {
      const sanitize = await import('sanitize-html')
      const sanitizedHTML = await sanitize.default(text)
      formData.append('text', sanitizedHTML)
    }

    if (previewData) {
      formData.append('preview', 'true')
      formData.append(
        'preview_description',
        previewData.description ? previewData.description : ''
      )
      formData.append(
        'preview_youtubeId',
        previewData.youtubeId ? previewData.youtubeId : ''
      )
      formData.append(
        'preview_favicons',
        previewData.favicons ? previewData.favicons.join(',') : ''
      )
      formData.append(
        'preview_images',
        previewData.images ? previewData.images.join(',') : ''
      )
      formData.append(
        'preview_siteName',
        previewData.siteName ? previewData.siteName : ''
      )
      formData.append(
        'preview_title',
        previewData.title ? previewData.title : ''
      )
      formData.append(
        'preview_url',
        previewData.url ? previewData.url : ''
      )
    }

    formData.append('userId', selectedAccount._id)

    for (let i = 0; i < uploadedStatus.nameArray.length; i++) {
      formData.append('images[]', uploadedStatus.nameArray[i].toString());
    }

    createPostReply.mutate(formData)
  }

  return (
    <div>
      <TextEditor
        ref={editorRef}
        containerClassName='w-full'
        placeholder='Write your reply'
        handlePreviewData={handlePreviewData}
        canResetPreview={canResetPreview}
        toggleResetPreview={toggleResetPreview}
        toggleDisablePost={toggleDisablePost}
        customEditorId='create-reply'
        previewData={previewData}
        previewType='compact'
      />

      <div className='mt-4'>
        <ImageUpload
          isLoading={createPostReply.isLoading}
          posted={posted}
          isDisablePost={isDisablePost}
          handlePost={handlePost}
          files={files}
          handleFiles={handleFiles}
        />
      </div>
    </div>
  )
}

export default CreateReply
