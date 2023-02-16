import React, { memo } from 'react'
import Image from 'next/image'

interface UploadedImagesProps {
  files: FileList | null
  prevFiles: string[] | null
  removeFile: (
    index: number,
    type: 'uploaded' | 'notUploaded'
  ) => void
}

const UploadedImages = memo(
  ({ files, prevFiles, removeFile }: UploadedImagesProps) => {
    return (
      <React.Fragment>
        {prevFiles &&
          prevFiles.map((image, i) => (
            <div key={image} className='group relative w-10 h-10'>
              <div
                onClick={() => removeFile(i, 'uploaded')}
                className='hidden shadow-[0px_0px_10px_0px_rgba(0,0,0,0.4)] group-hover:flex justify-center items-center cursor-pointer absolute right-[-5px] top-[-5px] bg-white p-1 w-4 h-4 rounded-full z-[1] '
              >
                <p className='text-xs'>x</p>
              </div>
              <Image
                src={image}
                alt='file'
                fill
                className='rounded-lg border-[0.0625rem] border-slate-300 object-cover'
              />
            </div>
          ))}
        {files &&
          Array(files.length)
            .fill(null)
            .map((file, i) => (
              <div key={file} className='group relative w-10 h-10'>
                <div
                  onClick={() => removeFile(i, 'notUploaded')}
                  className='hidden shadow-[0px_0px_10px_0px_rgba(0,0,0,0.4)] group-hover:flex justify-center items-center cursor-pointer absolute right-[-5px] top-[-5px] bg-white p-1 w-4 h-4 rounded-full z-[1] '
                >
                  <p className='text-xs'>x</p>
                </div>
                <Image
                  src={URL.createObjectURL(files[i])}
                  alt='file'
                  fill
                  className='rounded-lg border-[0.0625rem] border-slate-300 object-cover'
                />
              </div>
            ))}
      </React.Fragment>
    )
  },
  function arePropsEqual(
    oldProps: Readonly<UploadedImagesProps>,
    newProps: Readonly<UploadedImagesProps>
  ): boolean {
    return (
      (oldProps.files &&
        newProps.files &&
        oldProps.files.length === newProps.files.length &&
        oldProps.prevFiles &&
        newProps.prevFiles &&
        oldProps.prevFiles.length === newProps.prevFiles.length) ||
      false
    )
  }
)

UploadedImages.displayName = 'UploadedImages'

export default UploadedImages
