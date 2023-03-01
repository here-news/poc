import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { getTypeMedia } from 'utils'

interface ImagesProps {
  images: string[] | undefined
  handleSelectedImages: (images: string[], index?: number) => void
}

function Images({ images, handleSelectedImages }: ImagesProps) {
  const [center_video_url, setCenterVideoUrl] = useState<string>('') 
  const [all_images, setAllImages] = useState<string[]|null>(null);

  useEffect(() => {
    if(images) {
      const videoArray = images.filter(item => getTypeMedia(item) === 'video')

      if(videoArray?.length) {
        setCenterVideoUrl(videoArray[0])
      } else setCenterVideoUrl('')

      const imageArray = images.filter(item => getTypeMedia(item) === 'image')
      
      setAllImages([...imageArray]) ;
    }
  }, [images])
 
  return (
    <div className='flex flex-row flex-wrap gap-2 justify-between items-center'>
      {
        center_video_url && <video className='w-full' controls>
          <source src={center_video_url}  />
        </video>
      }
      {images && all_images && all_images.length <= 4
        ? all_images.slice(0, all_images.length ).map((item, index) => (
            <div
              className='cursor-pointer flex-[41%] p-1 relative'
              key={item + ' ' + index}
              onClick={() => handleSelectedImages([...all_images].concat([center_video_url]), index)}
            >
              <div
                className={`w-full ${
                  all_images.length === 1 ? 'h-[250px]' : 'h-[250px]'
                }`}
              >
                {
                  getTypeMedia(item) === 'image' && <Image
                    src={item}
                    fill
                    alt='post image'
                    quality={20}
                    className='object-cover'
                  />
                }
              </div>
            </div>
          ))
        : images && all_images &&
          all_images.slice(0, 4).map((item, index) => (
            <div
              className='cursor-pointer flex-[41%] p-1 relative'
              key={item + ' ' + index}
              onClick={() => handleSelectedImages([...all_images].concat([center_video_url]), index)}
            >
              <div
                className={`w-full ${
                  all_images.length === 1 ? 'h-[250px]' : 'h-[250px]'
                }`}
              >
                {
                  getTypeMedia(item) === 'image' && <Image
                    src={item}
                    fill
                    alt='post image'
                    quality={20}
                    className='object-cover'
                  />
                }
              </div>
              {index == 3 && (
                <div className='flex flex-row absolute bg-[rgba(0,0,0,0.5)] justify-center items-center top-0 left-0 w-full h-full'>
                  <p className='font-bold text-4xl text-white'>
                    +{all_images.length - 4}
                  </p>
                </div>
              )}
            </div>
          ))}
    </div>
  )
}

export default Images
