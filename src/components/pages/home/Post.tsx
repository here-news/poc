import Image from 'next/image'
import React from 'react'
import { IPost } from 'types/interfaces'
import Avatar from 'assets/avatar.png'
import { formatDistance } from 'date-fns'

function Post({ _id, userId, createdAt, images, text }: IPost) {
  return (
    <div className='relative border-[0.0625rem] border-slate-400 bg-white p-2 w-full'>
      <div className='flex flex-row justify-between items-center'>
        <div className='flex items-center'>
          <div className='relative w-8 h-8'>
            <Image
              src={Avatar}
              fill
              alt='post image'
              className='rounded-full'
            />
          </div>
          <div className='flex flex-col ml-2'>
            <h4 className='text-md'>Malik AA</h4>
            <p className='text-xs text-slate-500'>
              {formatDistance(new Date(createdAt), new Date(), {
                addSuffix: true
              })}
            </p>
          </div>
        </div>
      </div>
      <div>
        {text && (
          <div
            className={`mt-2 ${
              !images || (images && images.length <= 0) ? 'mb-4' : ''
            }`}
            dangerouslySetInnerHTML={{
              __html: text
            }}
          />
        )}
        <div className='grid grid-cols-2 gap-2'>
          {images &&
            images.length > 0 &&
            images.map(image => (
              <div
                className='relative h-full w-full'
                key={image}
                style={{ minHeight: '0' }}
              >
                <Image
                  src={image}
                  alt='post image'
                  fill
                  className='!relative object-cover'
                />
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

export default Post
