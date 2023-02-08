import axios from 'axios'
import TextEditor from 'components/TextEditor/TextEditor'
import { ENV } from 'lib/env'
import Image from 'next/image'
import React, { useRef, useState } from 'react'
import { QueryClient, useMutation } from 'react-query'
import { toast } from 'react-toastify'
import { useAppSelector } from 'store/hooks'

function CreatePost() {
  const queryClient = new QueryClient()
  const { accounts, selectedAccount } = useAppSelector(
    state => state.auth
  )
  const [text, setText] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const imageRef = useRef<HTMLInputElement | null>(null)

  const handleText = (value: string) =>
    value.length <= 1000 && setText(value)

  const handleUploadImages = () => {
    imageRef.current && imageRef.current.click()
  }

  const handleFileSelected = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setFiles(e.target.files)
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
        toast('Successfully created posts!')
        setText('')
        setFiles(null)
        queryClient.invalidateQueries('getExplorePosts')
      },
      onError: () => {
        toast.error('There was some error create post!')
      }
    }
  )

  const handlePost = () => {
    if (!selectedAccount) return toast.error('Please log in!')

    if (!text && !files)
      return toast.error('Please enter some details!')
    const formData = new FormData()

    if (files && files.length) {
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i])
      }
    }
    if (text) {
      formData.append('text', text)
    }

    formData.append('userId', selectedAccount._id)
    createPost.mutate(formData)
  }

  if (!accounts || !selectedAccount) return <React.Fragment />
  return (
    <div className='w-full max-w-[40rem] px-4'>
      <TextEditor
        html={text}
        handleChange={handleText}
        containerClassName='w-full'
        placeholder="What's on your mind?"
      />

      <div className='flex flex-row items-center justify-between mt-2'>
        <input
          type='file'
          ref={imageRef}
          multiple={true}
          style={{
            display: 'none'
          }}
          accept='image/png, image/gif, image/jpeg'
          onChange={handleFileSelected}
        />
        <div className='flex flex-col gap-2'>
          <div className='flex flex-row gap-x-2'>
            {files &&
              files.length &&
              Array(files.length)
                .fill(null)
                .map((_, i) => (
                  <div key={i} className='group relative w-10 h-10'>
                    <div
                      onClick={() => removeFile(i)}
                      className='hidden group-hover:flex justify-center items-center cursor-pointer absolute right-[-5px] top-[-5px] shadow-md bg-white p-1 w-4 h-4 rounded-full z-[1] '
                    >
                      <p className='text-xs'>x</p>
                    </div>
                    <Image
                      src={URL.createObjectURL(files[i])}
                      alt='file'
                      fill
                      className='rounded-lg object-cover'
                    />
                  </div>
                ))}
          </div>
          <div className='flex flex-row gap-2 items-end'>
            <p
              className='cursor-pointer text-md text-blue-500 underline'
              onClick={() => handleUploadImages()}
            >
              Images
            </p>
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
          className={`cursor-pointer ${
            createPost.isLoading ? 'bg-slate-600' : 'bg-blue-600'
          } px-4 py-2 rounded-md text-white flex justify-center items-center`}
          onClick={() => !createPost.isLoading && handlePost()}
        >
          <p className='text-sm'>
            {createPost.isLoading ? 'Posting...' : 'Post'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default CreatePost
