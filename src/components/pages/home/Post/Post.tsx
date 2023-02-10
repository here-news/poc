import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { MdMoreHoriz, MdDelete } from 'react-icons/md'
import { IoMdPersonAdd, IoMdFlag } from 'react-icons/io'
import formatDistance from 'date-fns/formatDistance'

import { useAppSelector } from 'store/hooks'
import Avatar from 'assets/avatar.png'
import { IPost } from 'types/interfaces'

import VotesCounter from './VotesCounter'
import Images from './Images'

interface PostProps extends IPost {
  handleSelectedImages: (images: string[], index?: number) => void
}
function Post({
  _id,
  userId,
  createdAt,
  images,
  title,
  text,
  upvotes,
  downvotes,
  totalVotes,
  handleSelectedImages
}: PostProps) {
  const { accounts } = useAppSelector(state => state.auth)
  const moreOptionsMenuRef = useRef<HTMLDivElement | null>(null)
  const [height, setHeight] = useState('100px')
  const contentRef = useRef<HTMLDivElement | null>(null)

  const [isMoreOptions, setIsMoreOptions] = useState(false)
  const toggleMoreOptions = () => setIsMoreOptions(prev => !prev)

  useEffect(() => {
    if (!isMoreOptions) {
      document.removeEventListener('mousedown', handleClickOutside)
      return
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMoreOptions])

  function handleClickOutside(e: MouseEvent) {
    if (!e) return
    const target = e.target as Node

    if (moreOptionsMenuRef?.current?.contains(target)) return
    setIsMoreOptions(false)
  }

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

  return (
    <div className='relative border-[0.0625rem] border-slate-400 bg-white p-4 w-full'>
      <div className='flex flex-row justify-between items-center'>
        <div className='flex items-center'>
          <VotesCounter
            postId={_id}
            downvotes={downvotes}
            upvotes={upvotes}
            totalVotes={totalVotes}
          />
          <div className='relative w-8 h-8 ml-2'>
            <Image
              src={Avatar}
              fill
              alt='post image'
              className='rounded-full'
            />
          </div>
          <div className='flex flex-col ml-2'>
            <h4 className='text-md'>{userId.displayName}</h4>
            <p className='text-xs text-slate-500'>
              {formatDistance(new Date(createdAt), new Date(), {
                addSuffix: true
              })}
            </p>
          </div>
        </div>

        {!accounts ||
          (accounts &&
            !accounts
              .map(account => account._id)
              .includes(userId._id) && (
              <div className='relative' ref={moreOptionsMenuRef}>
                <div
                  className='cursor-pointer'
                  onClick={() => toggleMoreOptions()}
                >
                  <MdMoreHoriz className='text-2xl' />
                </div>

                {isMoreOptions && (
                  <div className='z-[1] bg-white shadow-md min-w-[180px] absolute top-[1.375rem] right-0 rounded-lg py-2 px-2'>
                    <div className='flex items-center'>
                      <IoMdPersonAdd className='text-lg' />
                      <p className='text-sm px-2 py-3 cursor-pointer'>
                        Follow {userId.displayName}
                      </p>
                    </div>
                    <div className='flex items-center'>
                      <MdDelete className='text-lg' />
                      <p className='text-sm px-2 py-3 cursor-pointer'>
                        Delete post
                      </p>
                    </div>
                    <div className='flex items-center'>
                      <IoMdFlag className='text-lg' />
                      <p className='text-sm px-2 py-3 cursor-pointer'>
                        Flag contect
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
      </div>
      <div>
        {text && (
          <div
            className={`flex flex-col mt-2 ${
              !images || (images && images.length <= 0) ? 'mb-4' : ''
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
            <div
              className={`flex-1 justify-end my-5 ${
                height === '100px' ? 'flex' : 'hidden'
              }`}
            >
              <button
                className='text-blue-600 underline text-sm'
                onClick={handleClick}
              >
                Show More
              </button>
            </div>
          </div>
        )}
        <div className='flex-1'>
          <Images
            images={images}
            handleSelectedImages={handleSelectedImages}
          />
        </div>
      </div>
    </div>
  )
}

export default Post
