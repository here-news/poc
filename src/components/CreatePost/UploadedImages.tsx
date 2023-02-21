import React, { memo } from 'react'
import Image from 'next/image'

interface UploadedImagesProps {
  files: FileList
  removeFile: (index: number) => void
}
const UploadedImages = memo(
  ({ files, removeFile }: UploadedImagesProps) => {
    return (
      <React.Fragment>
        {Array(files.length)
          .fill(null)
          .map((file, i) => (
            <div key={file} className='group relative w-10 h-10'>
              <div
                onClick={() => removeFile(i)}
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
    oldProps: UploadedImagesProps,
    newProps: UploadedImagesProps
  ) {
    return oldProps.files.length === newProps.files.length
  }
)

UploadedImages.displayName = 'UploadedImages'

export default UploadedImages
