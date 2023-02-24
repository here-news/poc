import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { getTypeMedia } from 'helper/stringHelper'

interface ImagesProps {
  images: string[] | undefined
  handleSelectedImages: (images: string[], index?: number) => void
}

function Images({ images, handleSelectedImages }: ImagesProps) {
  const [center_video_url, setCenterVideoUrl] = useState<string>('') 
  const [remained_view_index, setRemainedViewIndex] = useState<number>(3)
  const [limited_image_count, setLimitedImageCount] = useState<number>(1)

  useEffect(() => {
    if(images) {
      const videoArray = images.filter(item => getTypeMedia(item) === 'video')

      if(videoArray?.length) {
        setCenterVideoUrl(videoArray[0])
      }

      if (images.length > 4) {
        if (videoArray?.length) {
          setRemainedViewIndex(1)
          setLimitedImageCount(2)
        } else {
          setRemainedViewIndex(3)
          setLimitedImageCount(4)
        }
      } else {
        setLimitedImageCount(images.length)
        setRemainedViewIndex(images.length)
      }
    }
  }, [images, center_video_url])
 
  return (
    <div className='flex flex-row flex-wrap gap-2 justify-between items-center'>
      {
        center_video_url && <video style={{width:'100%'}} controls>
          <source src={center_video_url}  />
        </video>
      }
      {images && images.length <= 4
        ? images.slice(0, limited_image_count ).map((item, index) => (
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
        : images &&
          images.slice(0, limited_image_count).map((item, index) => (
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
              {index == remained_view_index && (
                <div className='flex flex-row absolute bg-[rgba(0,0,0,0.5)] justify-center items-center top-0 left-0 w-full h-full'>
                  <p className='font-bold text-4xl text-white'>
                    +{images.length - (remained_view_index + 1 + (center_video_url ? 1 : 0))}
                  </p>
                </div>
              )}
            </div>
          ))}
    </div>
  )
}

export default Images
