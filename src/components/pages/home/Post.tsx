import Image from 'next/image'
import React from 'react'

function Post() {
  return (
    <div className='relative border-[0.0625rem] border-slate-400 bg-white p-2'>
      <div className=''>
        <div className='relative'>
          <Image
            src='http://localhost:4000/images/images-1675426987011.jpeg'
            fill
            alt='post image'
          />
        </div>
        <h3 className='text-lg'>
          This is a new post to check out all the details!
        </h3>
      </div>
    </div>
  )
}

export default Post
