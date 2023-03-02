import React, { memo } from 'react'
import Image from 'next/image'
import { getTypeMedia } from 'utils';
import Loading from 'react-loading';
import { IUploadedStatus } from 'types/interfaces';

interface UploadedImagesProps {
  files: FileList | null
  prevFiles: string[] | null
  uploadLoading?: Boolean
  uploadedStatus? : IUploadedStatus
  removeFile: (
    index: number,
    type: 'uploaded' | 'notUploaded'
  ) => void
}

const UploadedImages =
  ({ files, prevFiles, removeFile, uploadLoading, uploadedStatus }: UploadedImagesProps) => {
    return (
      <React.Fragment>
        {prevFiles &&
          prevFiles.map((image, i) => (
            <div key={image} className='group relative w-10 h-10'>
              {!uploadLoading && <div
                  onClick={() => removeFile(i, 'uploaded')}
                  className='hidden shadow-[0px_0px_10px_0px_rgba(0,0,0,0.4)] group-hover:flex justify-center items-center cursor-pointer absolute right-[-5px] top-[-5px] bg-white p-1 w-4 h-4 rounded-full z-[1] '
                >
                  <p className='text-xs'>x</p>
              </div>}
              {getTypeMedia(image) == 'image' && (
                  <Image
                    src={image}
                    alt='file'
                    fill
                    className='rounded-lg border-[0.0625rem] border-slate-300 object-cover'
                  />
                )}
                {getTypeMedia(image) == 'video' && (
                  <div
                    className='flex align-items justify-center w-full h-full border-gray-[600] border-[1.5px] border-solid rounded-[7px] overflow-hidden'
                  >
                    <video className='object-cover' playsInline muted autoPlay loop>
                      <source
                        src={image}
                      />
                    </video>
                  </div>
                )}
            </div>
          ))}
        {files && [...Array(files.length)]
            .map((file : any, i : number) => (
              <div key={i} className='group relative w-10 h-10'>
                {!uploadLoading &&<div
                    onClick={() => removeFile(i, 'notUploaded')}
                    className='hidden shadow-[0px_0px_10px_0px_rgba(0,0,0,0.4)] group-hover:flex justify-center items-center cursor-pointer absolute right-[-5px] top-[-5px] bg-white p-1 w-4 h-4 rounded-full z-[1] '
                  >
                    <p className='text-xs'>x</p>
                </div>}
              
                {uploadedStatus && !uploadedStatus.nameArray[i] && (
                  <div className='absolute top-0 left-0 w-full h-full border-b-2 flex items-center justify-center z-10'>
                    <Loading
                      type='spin'
                      color='red'
                      width={25}
                      height={25}
                    />
                  </div>
                )}
                {files[i].type.search('image') >= 0 && (
                  <Image
                    src={URL.createObjectURL(files[i])}
                    alt='file'
                    fill
                    className='rounded-lg border-[0.0625rem] border-slate-300 object-cover'
                  />
                )}
                {files[i].type.search('video') >= 0 && (
                  <div
                    className='flex align-items justify-center w-full h-full border-gray-[600] border-[1.5px] border-solid rounded-[7px] overflow-hidden'
                  >
                    <video className='object-cover'>
                      <source
                        type={files[i].type}
                        src={URL.createObjectURL(files[i])}
                      />
                    </video>
                  </div>
                )}
              </div>
            ))}
      </React.Fragment>
    )
}

UploadedImages.displayName = 'UploadedImages'

export default UploadedImages
