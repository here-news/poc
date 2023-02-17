import React, {useRef, useState} from 'react'
import axios from 'axios'
import {ENV} from 'lib/env'
import {useMutation, useQueryClient} from 'react-query'
import {toast} from 'react-toastify'
import {IoMdImages} from 'react-icons/io'
import Quill from 'quill'

import {ILinkDetails} from 'types/interfaces'
import {useAppSelector} from 'store/hooks'
import TextEditor from 'components/TextEditor/TextEditor'
import Input from 'components/Input'
import UploadedImages from './UploadedImages'

function CreatePost() {
  const queryClient = useQueryClient()
  const {accounts, selectedAccount} = useAppSelector(state => state.auth)

  const [isDisablePost, setIsDisablePost] = useState(false)
  const [canResetPreview, setCanResetPreview] = useState(false)
  const [title, setTitle] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [previewData, setPreviewData] = useState<ILinkDetails | null>(null)
  const [posted, setPosted] = useState(false)

  const quillRef = useRef<Quill | null>(null)
  const imageRef = useRef<HTMLInputElement | null>(null)

  const handlePreviewData = (data?: ILinkDetails) => {
    if (data) setPreviewData(data)
    else setPreviewData(null)
  }

  const handleTitle = (value: string) => setTitle(value)
  const toggleResetPreview = () => setCanResetPreview(prev => !prev)
  const toggleDisablePost = (state: boolean) => setIsDisablePost(state)

  const handleUploadImages = () => {
    imageRef.current && imageRef.current.click()
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!e.target.files) return

    let lengthOfFiles = files
      ? files.length + e.target.files.length
      : e.target.files

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
    setFiles(null)
  }

  const removeFile = (index: number) => {
    if (!files) return

    const dt = new DataTransfer()

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (index !== i) dt.items.add(file)
    }

    setFiles(dt.files && dt.files.length > 0 ? dt.files : null)
  }

  const createPost = useMutation(
    (data: FormData) => {
      return axios.post(`${ENV.API_URL}/createPost`, data)
    },
    {
      onSuccess: () => {
        if (quillRef.current) {
          quillRef.current.setText('')
        }
        setPreviewData(null)
        toggleResetPreview()

        setTitle('')
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
    if (!title) return toast.error('Please enter title!')
    if (
      !files &&
      (!text ||
        (text &&
          (text.trim() === '<p><br /></p>' || text.trim() === '<p><br></p>')))
    )
      return toast.error('Please either enter some text or images!')

    const formData = new FormData()

    formData.append('title', title)

    if (files && files.length) {
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i])
      }
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

    formData.append('userId', selectedAccount._id)
    createPost.mutate(formData)
  }

  if (!accounts || !selectedAccount) return <React.Fragment />
  return (
    <div className='w-full max-w-[40rem] bg-white p-4'>
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
            {files && files.length && (
              <React.Fragment>
                <p className='text-md text-slate-400'>
                  {files.length} Selected
                </p>
                <p
                  className='cursor-pointer text-md text-blue-500 underline'
                  onClick={clearImages}
                >
                  Clear
                </p>
              </React.Fragment>
            )}
          </div>
        </div>
        <div
          className={`cursor-pointer transition duration-500 ease-in-out ${
            createPost.isLoading || isDisablePost
              ? 'bg-slate-600'
              : posted
              ? 'bg-green-600'
              : 'bg-blue-600'
          } px-4 py-2 rounded-md text-white flex justify-center items-center`}
          onClick={() =>
            !createPost.isLoading && !isDisablePost && handlePost()
          }
        >
          <p className='text-sm'>
            {createPost.isLoading ? 'Posting...' : posted ? 'Posted!' : 'Post'}
          </p>
        </div>
      </div>
      <div className='flex flex-row gap-2 flex-wrap mb-2'>
        {files && files.length && (
          <UploadedImages files={files} removeFile={removeFile} />
        )}
      </div>
      <Input
        onChange={handleTitle}
        value={title}
        placeholder='Enter title'
        type='text'
        className='mb-2'
        inputClassName='rounded-none placeholder:text-[#666]'
        inputProps={{
          maxLength: 120,
        }}
      />
      <TextEditor
        ref={quillRef}
        containerClassName='w-full'
        placeholder="What's on your mind?"
        handlePreviewData={handlePreviewData}
        canResetPreview={canResetPreview}
        toggleResetPreview={toggleResetPreview}
        toggleDisablePost={toggleDisablePost}
        customEditorId='create-edtior'
        previewData={previewData}
      />
    </div>
  )
}

export default CreatePost
