import React from 'react'
import { MdClose } from 'react-icons/md'
import LiteYouTubeEmbed from 'react-lite-youtube-embed'
import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css'

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
        <LiteYouTubeEmbed
          id={youtubeVideo}
          iframeClass='h-60 w-full'
          title='youtube video player'
        />
      </div>
    </div>
  )
}

export default YoutubePreview
