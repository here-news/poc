import axios from 'axios'
import UploadedImages from 'components/CreatePost/UploadedImages'
import { ENV } from 'lib/env'
import React, { useRef, useState, useEffect } from 'react'
import { FiPaperclip } from 'react-icons/fi'
import { toast } from 'react-toastify'
import FileUploadService from 'services/FileUploadService'

interface ImageUploadProps {
  isLoading: boolean
  posted: boolean
  isDisablePost: boolean
  handlePost: (uploadedFileNameArray : String[]) => void
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
  const [uploadedSizeArray, setUploadedSizeArray] = useState<Number[]>([])
  const [uploadedFileNameArray,setUploadedFileNameArray] = useState<String[]>([]);
  const [uploadLoading, setUploadLoading] = useState<Boolean>(false)

  const handleFileSelected = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    if(!e.target.files) return

    let videoCount : number = 0 ;
    const maximum_size : number = 15728640 ;

    let tempSizeArray : Number[] = [] ;
    let tempNameArray : String[] = [] ;

    const newFormData : FormData = new FormData();

    const lengthOfFiles = files
      ? files.length + e.target.files.length
      : e.target.files

    if (lengthOfFiles > 10) {
      toast.error('You can only upload 10 media files')
    } else {
      const dt = new DataTransfer()

      if(files) {
        for (let i = 0; i < files.length ; i++) {
          if(files[i].type.search('video') >= 0) videoCount++;
          dt.items.add(files[i])
        }

        tempNameArray = [...uploadedFileNameArray]
        tempSizeArray = [...uploadedSizeArray]
      }
      
      for (let i = 0; i < (e.target.files.length <= 10 ? e.target.files.length : 10); i++) {
        if(e.target.files[i].type.search('video') >= 0) {
          if(videoCount === 1) {
            toast.error('You can only upload 1 video file');
            return ;
          }
          videoCount++;
        }

        if(e.target.files[i].size > maximum_size) {
          toast.error('You can only upload with maximum size of 15MB');
          return ;
        }

        newFormData.append('image', e.target.files[i])
        dt.items.add(e.target.files[i])
        
        tempSizeArray.push(0)
        tempNameArray.push("")
      }

      setUploadLoading(true)
      handleFiles(dt.files)

      const first_index = files ? files.length : 0 ;

      for(let i = 0 ; i < e.target.files.length ; i++) {
        FileUploadService.upload(e.target.files[i], (event: any) => {
          tempSizeArray[first_index + i] = Math.round((100 * event.loaded) / event.total)
          setUploadedSizeArray([...tempSizeArray])
        })
        .then((response) => {
          tempSizeArray[first_index + i] = 100
          tempNameArray[first_index + i] = response.data.url
          setUploadedSizeArray([...tempSizeArray])
          setUploadedFileNameArray([...tempNameArray])
        })
        .then((files) => {
        })
        .catch((err) => {
          tempSizeArray.splice(first_index + i , 1) ;
          tempNameArray.splice(first_index + i, 1) ;

          dt.items.remove(i);
          handleFiles(dt.files);
          setUploadedSizeArray([...tempSizeArray])
          setUploadedFileNameArray([...tempNameArray])
        });
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
  }

  const removeFile = (index: number) => {
    if (!files) return

    const dt = new DataTransfer()
   
    let tempSizedArray = [...uploadedSizeArray] ;
    let tempNameArray = [...uploadedFileNameArray] ;

    tempSizedArray.splice(index, 1)
    tempNameArray.splice(index, 1)

    axios.post(`${ENV.API_URL}/removeFile`, {
      filename : uploadedFileNameArray[index]
    })

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (index !== i) dt.items.add(file)
    }

    handleFiles(dt.files && dt.files.length > 0 ? dt.files : null)
    setUploadedFileNameArray([...tempNameArray])
    setUploadedSizeArray([...tempSizedArray])
  }

  useEffect(() => {
    const filledSizeCount = uploadedSizeArray.filter(uploadedSize => uploadedSize === 100).length ;
    const filledNameCount = uploadedFileNameArray.filter(uploadedName => uploadedName !== "").length ;

    if (filledSizeCount === uploadedSizeArray.length 
      && filledNameCount === uploadedFileNameArray.length 
      && uploadedSizeArray.length === uploadedFileNameArray.length
    ) {
      setUploadLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedFileNameArray, uploadedSizeArray])

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
          onClick={() => !isLoading && !isDisablePost && !uploadLoading && handlePost(uploadedFileNameArray)}
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
            uploadedSizeArray={uploadedSizeArray}
            uploadedFileNameArray={uploadedFileNameArray}
          />
        )}
      </div>
    </div>
  )
}

export default ImageUpload
