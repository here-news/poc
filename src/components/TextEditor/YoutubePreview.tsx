import React from 'react'
import { MdClose } from 'react-icons/md'

interface YoutubePreviewProps {
  removeVideo: () => void
  youtubeVideo: string
}

const YoutubePreview = ({
  removeVideo,
  youtubeVideo
}: YoutubePreviewProps) => {
  return (
    <div className='relative'>
      <div
        className='absolute -top-2 -right-1 bg-black shadow-md rounded-full p-1 z-[1] cursor-pointer'
        onClick={e => {
          e.stopPropagation()
          removeVideo()
        }}
      >
        <MdClose className='text-white' />
      </div>
      <div className='w-full mt-4'>
        <iframe
          className='h-60 w-full'
          src={`https://www.youtube.com/embed/${youtubeVideo}`}
          title='YouTube video player'
          allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
          allowFullScreen
        />
      </div>
    </div>
  )
}

export default YoutubePreview
