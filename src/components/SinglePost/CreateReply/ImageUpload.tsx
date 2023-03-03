import axios from 'axios'
import UploadedImages from 'components/CreatePost/UploadedImages'
import { ENV } from 'lib/env'
import React, { useRef, useState, useEffect } from 'react'
import { FiPaperclip } from 'react-icons/fi'
import { toast } from 'react-toastify'
import FileUploadService from 'services/FileUploadService'
import { IUploadedStatus } from 'types/interfaces'
import { selectAndUploadMedia } from 'utils'

interface ImageUploadProps {
  isLoading: boolean
  posted: boolean
  isDisablePost: boolean
  handlePost: (uploadedStatus : IUploadedStatus) => void
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
  const [uploadLoading, setUploadLoading] = useState<Boolean>(false)
  const [uploadedStatus, setUploadedStatus] = useState<IUploadedStatus>({
    sizeArray : [],
    nameArray :[]
  });

  const handleFileSelected = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    if(!e.target.files) return

    const lengthOfFiles = files
      ? files.length + e.target.files.length
      : e.target.files.length

    if (lengthOfFiles > 10) {
      toast.error('You can only upload 10 media files')
    } else {
      let i : number = 0 ;
      let tempStatus : IUploadedStatus;
      setUploadLoading(true)

      for(const result of selectAndUploadMedia(
          null, files, e.target.files,
          uploadedStatus
      )){
        if(result.error) {
          setUploadLoading(false)
          break
        }
        if(result.selected) {
          handleFiles(result.files)
          setUploadedStatus(result.initialStatus)
          tempStatus = result.initialStatus
        } else {
          const index = i
          let countOfUploaded : number = files ? files.length : 0 

          result.then((response:any) => {
            tempStatus.sizeArray[countOfUploaded + index] = 100
            tempStatus.nameArray[countOfUploaded + index] = response.data.url
            setUploadedStatus({...tempStatus})
          }).catch((err:any) => {
            tempStatus.sizeArray.slice(countOfUploaded+index, 1)
            tempStatus.nameArray.slice(countOfUploaded+index, 1)
            setUploadedStatus({...tempStatus})
          })
          i++;
        }
      }
    }
  }

  const handleUploadImages = () => {
    if(uploadLoading) return
    imageRef.current && imageRef.current.click()
  }

  const clearImages = () => {
    if(uploadLoading) return
    handleFiles(null)
    if(imageRef.current) imageRef.current.value = ''
  }

  const removeFile = (index: number) => {
    if (!files) return

    const dt = new DataTransfer()
   
    let tempStatus = {...uploadedStatus}

    tempStatus.nameArray.splice(index, 1)
    tempStatus.sizeArray.splice(index, 1)

    axios.post(`${ENV.API_URL}/removeFile`, {
      filename : tempStatus.nameArray[index]
    })

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (index !== i) dt.items.add(file)
    }

    handleFiles(dt.files && dt.files.length > 0 ? dt.files : null)
    setUploadedStatus({...tempStatus})
  }

  useEffect(() => {
    const filledSizeCount = uploadedStatus.sizeArray.filter(uploadedSize => uploadedSize === 100).length ;
    const filledNameCount = uploadedStatus.nameArray.filter(uploadedName => uploadedName !== "").length ;

    if (filledSizeCount === uploadedStatus.sizeArray.length 
      && filledNameCount === uploadedStatus.nameArray.length 
      && uploadedStatus.sizeArray.length === uploadedStatus.nameArray.length
    ) {
      setUploadLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedStatus])

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
          accept='image/png, image/gif, image/jpeg, image/webp, video/*'
          onChange={handleFileSelected}
        />
        <div className='flex flex-col gap-2'>
          <div className='flex flex-row gap-2 items-end'>
            <div className='flex items-center justify-center z-[1] cursor-pointer'>
              <p
                className={`${uploadLoading && 'cursor-not-allowed'}text-black text-xl hover:bg-black hover:text-white px-2 py-2 rounded-lg flex flex-row items-center`}
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
                  className={`${uploadLoading ? 'cursor-not-allowed' : 'cursor-pointer'} text-md text-blue-500 underline`}
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
            isLoading || isDisablePost || uploadLoading
              ? 'bg-slate-600'
              : posted
              ? 'bg-green-600'
              : 'bg-blue-600'
          } px-4 py-2 rounded-md text-white flex justify-center items-center`}
          onClick={() => !isLoading && !isDisablePost && !uploadLoading && handlePost(uploadedStatus)}
        >
          <p className='text-sm'>
            {isLoading ? 'Posting...' : posted ? 'Posted!' : 'Post'}
          </p>
        </div>
      </div>
      <div className='flex flex-row gap-2 flex-wrap mb-2'>
        {files && files.length && (
          <UploadedImages 
            files={files} removeFile={removeFile} 
            uploadLoading={uploadLoading}
            uploadedStatus={uploadedStatus}
          />
        )}
      </div>
    </div>
  )
}

export default ImageUpload
