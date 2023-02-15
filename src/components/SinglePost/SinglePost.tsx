import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/router'
import formatDistance from 'date-fns/formatDistance'

import Avatar from 'assets/avatar.png'
import { IPost } from 'types/interfaces'

import VotesCounter from './VotesCounter'
import Images from './Images'
import Buttons from './Buttons'
import LinkDetails from './LinkDetails'

interface SinglePostProps extends IPost {
  noBorder?: boolean
  canPushToPost?: boolean
  totalComments: number
  handleSelectedImages: (images: string[], index?: number) => void
}

function SinglePost({
  _id,
  userId,
  createdAt,
  images,
  title,
  text,
  upvotes,
  downvotes,
  totalVotes,
  handleSelectedImages,
  noBorder,
  canPushToPost,
  totalComments,
  preview
}: SinglePostProps) {
  const router = useRouter()
  const [height, setHeight] = useState('100px')
  const contentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (
      contentRef.current &&
      contentRef.current.scrollHeight <= 100
    ) {
      setHeight(contentRef.current.scrollHeight + 'px')
    }
  }, [contentRef, text])

  function handleClick() {
    if (!contentRef.current) return
    setHeight(contentRef.current.scrollHeight + 'px')
  }

  const moveToPage = () => {
    canPushToPost && router.push(`/post/${_id}`)
  }

  return (
    <div
      className={`relative bg-white w-full ${
        !noBorder ? 'border-[0.0625rem] border-slate-400' : ''
      } ${
        canPushToPost
          ? 'cursor-pointer transition-colors duration-300 hover:bg-slate-100'
          : ''
      }`}
      onClick={moveToPage}
    >
      <div className='flex flex-row justify-between items-center mx-4'>
        <div className='flex items-center flex-1'>
          <div onClick={e => e.stopPropagation()}>
            <VotesCounter
              postId={_id}
              downvotes={downvotes}
              upvotes={upvotes}
              totalVotes={totalVotes}
            />
          </div>
          <div className='relative w-8 h-8 ml-2'>
            <Image
              src={Avatar}
              fill
              alt='post image'
              className='rounded-full'
            />
          </div>
          <div className={`flex flex-col flex-1 ml-2`}>
            <h4 className='text-md'>{userId.displayName}</h4>
            <p className='text-xs text-slate-500'>
              {formatDistance(new Date(createdAt), new Date(), {
                addSuffix: true
              })}
            </p>
          </div>
        </div>
      </div>
      <div>
        {preview && (
          <LinkDetails
            url={preview.url}
            description={preview.description}
            favicons={preview.favicons}
            images={preview.images}
            siteName={preview.siteName}
            title={preview.title}
          />
        )}
        {text && (
          <div
            className={`flex flex-col mt-2 mx-4 ${
              !images || (images && images.length <= 0)
                ? 'mb-4'
                : height !== '100px'
                ? 'mb-4'
                : ''
            }`}
          >
            <h2 className='text-lg font-bold mb-4'>{title}</h2>
            <div
              className='break-all'
              dangerouslySetInnerHTML={{
                __html: text
              }}
              ref={contentRef}
              style={{ maxHeight: height, overflow: 'hidden' }}
            />
            {height === '100px' && (
              <div className='flex-1 flex justify-end my-5'>
                <button
                  className='text-blue-600 underline text-sm'
                  onClick={e => {
                    e.stopPropagation()
                    handleClick()
                  }}
                  style={{
                    display: height === '100px' ? 'block' : 'none'
                  }}
                >
                  Show More
                </button>
              </div>
            )}
          </div>
        )}
        <div className='flex-1' onClick={e => e.stopPropagation()}>
          <Images
            images={images}
            handleSelectedImages={handleSelectedImages}
          />
        </div>
        <Buttons totalComments={totalComments} postId={_id} />
      </div>
    </div>
  )
}

export default SinglePost
