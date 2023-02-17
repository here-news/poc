import React from 'react'
import {MdClose} from 'react-icons/md'
import YouTube from 'react-youtube'

interface YoutubePreviewProps {
  removeVideo: () => void
  youtubeVideo: string
}

const YoutubePreview = ({removeVideo, youtubeVideo}: YoutubePreviewProps) => {
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
      <YouTube
        videoId={youtubeVideo}
        className='w-full mt-4'
        iframeClassName='w-full'
        onReady={event => {
          event.target.pauseVideo()
        }}
      />
    </div>
  )
}

export default YoutubePreview
