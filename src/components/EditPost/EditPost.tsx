import React, {useCallback, useEffect, useRef, useState} from 'react'
import axios from 'axios'
import {ENV} from 'lib/env'
import {useMutation, useQueryClient} from 'react-query'
import {toast} from 'react-toastify'
import {IoMdImages} from 'react-icons/io'
import Quill from 'quill'

import {ILinkDetails, IPost} from 'types/interfaces'
import {useAppSelector} from 'store/hooks'
import TextEditor from 'components/TextEditor/TextEditor'
import Input from 'components/Input'
import UploadedImages from './UploadedImages'

interface EditPostProps extends IPost {
  isModalVisible: boolean
  onSuccessCallback: () => void
}
function EditPost({
  _id,
  title,
  images,
  preview,
  text,
  isModalVisible,
  onSuccessCallback,
}: EditPostProps) {
  const queryClient = useQueryClient()
  const {accounts, selectedAccount} = useAppSelector(state => state.auth)

  const [isDisablePost, setIsDisablePost] = useState(false)
  const [canResetPreview, setCanResetPreview] = useState(false)
  const [titleState, setTitleState] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [prevFiles, setPrevFiles] = useState<string[] | null>(null)
  const [prevPreview, setPrevPreview] = useState<
    | {
        url: string
        favicons?: string[] | undefined
        siteName?: string | undefined
        images?: string[] | undefined
        title?: string | undefined
        description?: string | undefined
      }
    | undefined
    | null
  >(null)
  const [previewData, setPreviewData] = useState<ILinkDetails | null>(null)
  const [posted, setPosted] = useState(false)

  const quillRef = useRef<Quill | null>(null)
  const imageRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (isModalVisible) {
      if (title) setTitleState(title)
      if (images) setPrevFiles(images)
      if (preview) setPrevPreview(preview)
    } else {
      setCanResetPreview(true)
      setPrevFiles(null)
      setPrevPreview(null)
    }
  }, [isModalVisible, images, title, preview])

  const handlePreviewData = useCallback((data?: ILinkDetails) => {
    if (data) setPreviewData(data)
    else setPreviewData(null)
  }, [])

  const handleTitle = (value: string) => setTitleState(value)
  const toggleResetPreview = () => setCanResetPreview(prev => !prev)
  const toggleDisablePost = (state: boolean) => setIsDisablePost(state)

  const handleUploadImages = () => {
    imageRef.current && imageRef.current.click()
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!e.target.files) return

    let lengthOfFiles = e.target.files.length

    if (prevFiles) lengthOfFiles += prevFiles.length
    if (files) lengthOfFiles += files.length

    if (lengthOfFiles > 10) {
      toast.error('You can only upload 10 images')
    } else {
      const dt = new DataTransfer()

      if (files && files.length) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          dt.items.add(file)
        }
      }

      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i]
        dt.items.add(file)
      }

      setFiles(dt.files)
    }
  }

  const clearImages = () => {
    setPrevFiles(null)
    setFiles(null)
  }

  const removeFile = (index: number, type: 'uploaded' | 'notUploaded') => {
    if (!files && !prevFiles) return

    if (type === 'uploaded' && prevFiles) {
      const tempFiles = prevFiles ? [...prevFiles] : []
      tempFiles.splice(index, 1)
      setPrevFiles(tempFiles)
    } else if (type === 'notUploaded' && files) {
      const dt = new DataTransfer()

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (index !== i) dt.items.add(file)
      }

      setFiles(dt.files && dt.files.length > 0 ? dt.files : null)
    }
  }

  const editPost = useMutation(
    (data: FormData) => {
      return axios.post(`${ENV.API_URL}/editPost/${_id}`, data)
    },
    {
      onSuccess: () => {
        onSuccessCallback && onSuccessCallback()
        if (quillRef.current) {
          quillRef.current.setText('')
        }
        setPreviewData(null)
        toggleResetPreview()
        setTitleState('')
        setFiles(null)
        quillRef.current
        queryClient.invalidateQueries('getExplorePosts')
        queryClient.invalidateQueries('getTrendingPosts')
        setPosted(true)
        setTimeout(() => {
          setPosted(false)
        }, 1000)
      },
      onError: () => {
        toast.error('There was some error create post!')
      },
    }
  )

  const handlePost = async () => {
    const text = quillRef.current && quillRef.current.root.innerHTML

    if (posted) return
    if (!selectedAccount) return toast.error('Please log in!')
    if (!titleState) return toast.error('Please enter title!')
    if (
      !files &&
      !prevFiles &&
      (!text ||
        (text &&
          (text.trim() === '<p><br /></p>' || text.trim() === '<p><br></p>')))
    )
      return toast.error('Please either enter some text or images!')

    const formData = new FormData()

    formData.append('title', titleState)

    if (files && files.length) {
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i])
      }
    }

    if (prevFiles && prevFiles.length) {
      formData.append('prevImages', prevFiles.join(','))
    }
    if (text) {
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
      formData.append('preview_url', previewData.url ? previewData.url : '')
    }

    editPost.mutate(formData)
  }

  if (!accounts || !selectedAccount) return <React.Fragment />
  return (
    <div className='w-full max-w-[40rem] bg-white py-4'>
      <div className='flex flex-row items-center justify-between mb-2'>
        <input
          type='file'
          ref={imageRef}
          multiple={true}
          style={{
            display: 'none',
          }}
          accept='image/png, image/gif, image/jpeg, image/webp'
          onChange={handleFileSelected}
        />
        <div className='flex flex-col gap-2'>
          <div className='flex flex-row gap-2 items-end'>
            <div className='flex items-center justify-center z-[1] cursor-pointer'>
              <p
                className='text-white text-sm bg-black px-3 py-2 rounded-lg flex flex-row items-center'
                onClick={() => handleUploadImages()}
              >
                <span className='mr-2 text-lg'>
                  <IoMdImages color='white' />
                </span>
                Images
              </p>
            </div>

            {(files && files.length) || (prevFiles && prevFiles.length) ? (
              <React.Fragment>
                <p className='text-md text-slate-400'>
                  {files
                    ? prevFiles
                      ? files.length + prevFiles.length
                      : files.length
                    : prevFiles
                    ? prevFiles.length
                    : 0}{' '}
                  Selected
                </p>
                <p
                  className='cursor-pointer text-md text-blue-500 underline'
                  onClick={clearImages}
                >
                  Clear
                </p>
              </React.Fragment>
            ) : (
              ''
            )}
          </div>
        </div>
        <div
          className={`cursor-pointer transition duration-500 ease-in-out ${
            editPost.isLoading || isDisablePost
              ? 'bg-slate-600'
              : posted
              ? 'bg-green-600'
              : 'bg-blue-600'
          } px-4 py-2 rounded-md text-white flex justify-center items-center`}
          onClick={() => !editPost.isLoading && !isDisablePost && handlePost()}
        >
          <p className='text-sm'>
            {editPost.isLoading ? 'Posting...' : posted ? 'Posted!' : 'Post'}
          </p>
        </div>
      </div>
      <div className='flex flex-row gap-2 flex-wrap mb-2'>
        {(files && files.length) || (prevFiles && prevFiles.length) ? (
          <UploadedImages
            files={files}
            prevFiles={prevFiles ? prevFiles : null}
            removeFile={removeFile}
          />
        ) : (
          <React.Fragment />
        )}
      </div>
      <Input
        onChange={handleTitle}
        value={titleState}
        placeholder='Enter title'
        type='text'
        className='mb-2'
        inputClassName='rounded-none placeholder:text-[#666]'
        inputProps={{
          maxLength: 120,
        }}
      />
      <TextEditor
        isEdit={true}
        ref={quillRef}
        containerClassName='w-full'
        placeholder="What's on your mind?"
        handlePreviewData={handlePreviewData}
        canResetPreview={canResetPreview}
        toggleResetPreview={toggleResetPreview}
        toggleDisablePost={toggleDisablePost}
        customEditorId='edit-quill-editor'
        prevPreview={preview}
        prevText={text}
        previewData={previewData}
      />
    </div>
  )
}

export default EditPost
