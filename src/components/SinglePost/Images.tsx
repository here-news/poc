import Image from 'next/image'
import React from 'react'

interface ImagesProps {
  images: string[] | undefined
  handleSelectedImages: (images: string[], index?: number) => void
}

function Images({ images, handleSelectedImages }: ImagesProps) {
  return (
    <div className='rounded-2xl flex flex-row flex-wrap gap-2 justify-between items-center'>
      {images && images.length <= 4
        ? images.map((item, index) => (
            <div
              className='cursor-pointer flex-[41%] p-1 relative'
              key={item + ' ' + index}
              onClick={() => handleSelectedImages(images, index)}
            >
              <div
                className={`w-full ${
                  images.length === 1 ? 'h-[250px]' : 'h-[250px]'
                }`}
              >
                <Image
                  src={item}
                  fill
                  alt='post image'
                  quality={20}
                  className='rounded-lg object-cover'
                />
              </div>
            </div>
          ))
        : images &&
          images.slice(0, 4).map((item, index) => (
            <div
              className='cursor-pointer flex-[41%] p-1 relative'
              key={item + ' ' + index}
              onClick={() => handleSelectedImages(images, index)}
            >
              <div
                className={`w-full ${
                  images.length === 1 ? 'h-[250px]' : 'h-[250px]'
                }`}
              >
                <Image
                  src={item}
                  fill
                  alt='post image'
                  quality={20}
                  className='rounded-lg object-cover'
                />
              </div>
              {index === 3 && (
                <div className='flex flex-row absolute bg-[rgba(0,0,0,0.5)] rounded-lg justify-center items-center top-0 left-0 w-full h-full'>
                  <p className='font-bold text-4xl text-white'>
                    +{images.length - 4}
                  </p>
                </div>
              )}
            </div>
          ))}
    </div>
  )
}

export default Images
