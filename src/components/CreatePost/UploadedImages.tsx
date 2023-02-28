import React, { memo } from 'react'
import Image from 'next/image'
import Loading from 'react-loading';

interface UploadedImagesProps {
  files: FileList
  removeFile: (index: number) => void
  uploadLoading : Boolean
  uploadedSizeArray : Number[]
  uploadedFileNameArray : String[]
}

const UploadedImages = ({ files, removeFile, uploadLoading, uploadedSizeArray,uploadedFileNameArray }: UploadedImagesProps) => {
  return (
    <React.Fragment>
      {[...Array(files.length)]
        .map((file, i) => (
          <div key={i} className='group relative w-10 h-10'>
            {
              !uploadLoading && <div
                onClick={() => removeFile(i)}
                className='hidden shadow-[0px_0px_10px_0px_rgba(0,0,0,0.4)] group-hover:flex justify-center items-center cursor-pointer absolute right-[-5px] top-[-5px] bg-white p-1 w-4 h-4 rounded-full z-[1] '
              >
                <p className='text-xs'>x</p>
              </div>
            }
            {
              !uploadedFileNameArray[i] && <div className='absolute top-0 left-0 w-full h-full border-b-2 flex items-center justify-center z-10'>
                <Loading type='spin' color='red' width={25} height={25} />
              </div>
            }
            {
              files[i].type.search('image') >= 0 && <Image
                src={URL.createObjectURL(files[i])}
                alt='file'
                fill
                className='rounded-lg border-[0.0625rem] border-slate-300 object-cover'
              />
            }
            {
              files[i].type.search('video') >= 0 && <div className='flex align-items justify-center'
              style={{width : '100%', height:'100%',border : '1.5px solid lightgray', borderRadius: '7px', overflow : 'hidden'}}
              >
                <video style={{objectFit:'cover'}}>
                  <source type={files[i].type} src={URL.createObjectURL(files[i])}/>
                </video>
              </div>
            }
          </div>
        ))}
    </React.Fragment>
  )
}

UploadedImages.displayName = 'UploadedImages'

export default UploadedImages
