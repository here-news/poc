import React, { useRef, useState } from 'react'
import axios from 'axios'
import { ENV } from 'lib/env'
import { useMutation, useQueryClient } from 'react-query'
import { toast } from 'react-toastify'
import { IoMdImages } from 'react-icons/io'

import { useAppSelector } from 'store/hooks'
import TextEditor from 'components/TextEditor/TextEditor'
import Input from 'components/Input'
import UploadedImages from './UploadedImages'

function CreatePost() {
  const queryClient = useQueryClient()
  const { accounts, selectedAccount } = useAppSelector(
    state => state.auth
  )

  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [posted, setPosted] = useState(false)
  const imageRef = useRef<HTMLInputElement | null>(null)

  const handleTitle = (value: string) => setTitle(value)

  const handleText = (value: string) => setText(value)

  const handleUploadImages = () => {
    imageRef.current && imageRef.current.click()
  }

  const handleFileSelected = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
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
        setTitle('')
        setText('')
        setFiles(null)
        queryClient.invalidateQueries('getExplorePosts')
        setPosted(true)
        setTimeout(() => {
          setPosted(false)
        }, 1000)
      },
      onError: () => {
        toast.error('There was some error create post!')
      }
    }
  )

  const handlePost = async () => {
    if (posted) return
    if (!selectedAccount) return toast.error('Please log in!')
    if (!title) return toast.error('Please enter title!')
    if (!text && !files && !(text && text === '<p><br /></p>'))
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

    formData.append('userId', selectedAccount._id)
    createPost.mutate(formData)
  }

  if (!accounts || !selectedAccount) return <React.Fragment />
  return (
    <div className='w-full max-w-[40rem] bg-white p-4'>
      <Input
        onChange={handleTitle}
        value={title}
        placeholder='Enter title'
        type='text'
        className='mb-2'
        inputClassName='rounded-none placeholder:text-[#666]'
        inputProps={{
          maxLength: 120
        }}
      />
      <TextEditor
        html={text}
        handleChange={handleText}
        containerClassName='w-full'
        placeholder="What's on your mind?"
      />
      <div className='flex flex-row gap-2 flex-wrap mt-2'>
        {files && files.length && (
          <UploadedImages files={files} removeFile={removeFile} />
        )}
      </div>

      <div className='flex flex-row items-center justify-between mt-2'>
        <input
          type='file'
          ref={imageRef}
          multiple={true}
          style={{
            display: 'none'
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
            createPost.isLoading
              ? 'bg-slate-600'
              : posted
              ? 'bg-green-600'
              : 'bg-blue-600'
          } px-4 py-2 rounded-md text-white flex justify-center items-center`}
          onClick={() => !createPost.isLoading && handlePost()}
        >
          <p className='text-sm'>
            {createPost.isLoading
              ? 'Posting...'
              : posted
              ? 'Posted!'
              : 'Post'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default CreatePost
