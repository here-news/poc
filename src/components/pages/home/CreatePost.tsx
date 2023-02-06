import axios from 'axios'
import TextEditor from 'components/TextEditor'
import { ENV } from 'lib/env'
import React, { useRef, useState } from 'react'
import { useMutation } from 'react-query'
import { toast } from 'react-toastify'
import { useAppSelector } from 'store/hooks'

function CreatePost() {
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
  const createPost = useMutation(
    (data: FormData) => {
      return axios.post(`${ENV.API_URL}/createPost`, data)
    },
    {
      onSuccess: () => {
        toast('Successfully created posts!')
        setText('')
        setFiles(null)
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

    formData.append('accountId', selectedAccount._id)
    createPost.mutate(formData)
  }

  if (!accounts || !selectedAccount) return <React.Fragment />
  return (
    <div className='w-full max-w-[40rem] px-4'>
      <div className='flex justify-end mb-1'>
        <p className='text-slate-400 text-xs'>
          {text.length}/1000 characters
        </p>
      </div>

      {/* <TextEditor /> */}

      <textarea
        className='border-[1px] border-slate-300 p-2 rounded-md text-sm w-full'
        value={text}
        onChange={e => handleText(e.target.value)}
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
