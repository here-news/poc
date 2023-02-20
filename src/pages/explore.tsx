import CreatePost from 'components/pages/home/CreatePost/CreatePost'
import Explore from 'components/pages/home/Explore'
import React from 'react'

export default function explore() {
  return (
    <>
      <div className='flex flex-col items-center'>
        <div className='w-full max-w-[40rem] mt-2 px-2 md:px-0'>
          <CreatePost />
        </div>
      </div>
      <div className='flex flex-col items-center'>
        <Explore />
      </div>
    </>
  )
}
