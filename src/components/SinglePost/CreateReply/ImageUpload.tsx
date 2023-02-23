import UploadedImages from 'components/CreatePost/UploadedImages'
import React, { useRef, useState } from 'react'
import { FiPaperclip } from 'react-icons/fi'
import { toast } from 'react-toastify'

interface ImageUploadProps {
  isLoading: boolean
  posted: boolean
  isDisablePost: boolean
  handlePost: () => void
  files: FileList | null
  handleFiles: (files: FileList | null) => void
}

function ImageUpload({
  isLoading,
  posted,
  isDisablePost,
  handlePost,
  files,
  handleFiles
}: ImageUploadProps) {
  const imageRef = useRef<HTMLInputElement | null>(null)

  const handleFileSelected = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    if (!e.target.files) return

    const lengthOfFiles = files
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

      handleFiles(dt.files)
    }
  }

  const handleUploadImages = () => {
    imageRef.current && imageRef.current.click()
  }

  const clearImages = () => {
    handleFiles(null)
  }

  const removeFile = (index: number) => {
    if (!files) return

    const dt = new DataTransfer()

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (index !== i) dt.items.add(file)
    }

    handleFiles(dt.files && dt.files.length > 0 ? dt.files : null)
  }

  return (
    <div>
      <div className='flex flex-row items-center justify-between mb-2'>
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
                className='text-black text-xl hover:bg-black hover:text-white px-2 py-2 rounded-lg flex flex-row items-center'
                onClick={() => handleUploadImages()}
              >
                <FiPaperclip />
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
            isLoading || isDisablePost
              ? 'bg-slate-600'
              : posted
              ? 'bg-green-600'
              : 'bg-blue-600'
          } px-4 py-2 rounded-md text-white flex justify-center items-center`}
          onClick={() => !isLoading && !isDisablePost && handlePost()}
        >
          <p className='text-sm'>
            {isLoading ? 'Posting...' : posted ? 'Posted!' : 'Post'}
          </p>
        </div>
      </div>
      <div className='flex flex-row gap-2 flex-wrap mb-2'>
        {files && files.length && (
          <UploadedImages files={files} removeFile={removeFile} />
        )}
      </div>
    </div>
  )
}

export default ImageUpload
