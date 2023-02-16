import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/router'
import formatDistance from 'date-fns/formatDistance'
import { BiEdit } from 'react-icons/bi'
import { MdDelete, MdMoreHoriz } from 'react-icons/md'
import { useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import { toast } from 'react-toastify'

import Avatar from 'assets/avatar.png'
import { IPost } from 'types/interfaces'
import { useAppSelector } from 'store/hooks'

import VotesCounter from './VotesCounter'
import Images from './Images'
import Buttons from './Buttons'
import LinkDetails from './LinkDetails'
import { ENV } from 'lib/env'

interface SinglePostProps extends IPost {
  noBorder?: boolean
  canPushToPost?: boolean
  totalComments: number
  handleSelectedImages: (images: string[], index?: number) => void
  toggleEditPostModal: () => void
  handleSelectedPost: (post: IPost) => void
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
  handleSelectedPost,
  toggleEditPostModal,
  noBorder,
  canPushToPost,
  totalComments,
  preview
}: SinglePostProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { selectedAccount } = useAppSelector(state => state.auth)

  const moreOptionsMenuRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  const [height, setHeight] = useState('100px')
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

  const moveToPage = () => {
    canPushToPost && router.push(`/post/${_id}`)
  }

  const deletePostQuery = useMutation(
    () => {
      return axios.delete(`${ENV.API_URL}/deletePost/${_id}`)
    },
    {
      onSuccess: () => {
        toast.success('Successfully deleted post!')
        if (canPushToPost) {
          queryClient.invalidateQueries('getExplorePosts')
          queryClient.invalidateQueries('getTrendingPosts')
        } else {
          router.push('/')
        }
      },
      onError: () => {
        toast.error('There was some error deleting post!')
      }
    }
  )

  const editPost = () => {
    handleSelectedPost({
      _id,
      createdAt,
      downvotes,
      title,
      totalVotes,
      upvotes,
      userId,
      images,
      preview,
      text,
      totalComments
    })

    toggleEditPostModal()
  }

  const deletePost = () => {
    deletePostQuery.mutate()
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
          <div className='flex flex-col flex-1 ml-2'>
            <h4 className='text-md'>{userId.displayName}</h4>
            <p className='text-xs text-slate-500'>
              {formatDistance(new Date(createdAt), new Date(), {
                addSuffix: true
              })}
            </p>
          </div>
        </div>
        <div>
          {selectedAccount && selectedAccount._id === userId._id && (
            <div
              className='relative'
              ref={moreOptionsMenuRef}
              onClick={e => e.stopPropagation()}
            >
              <div
                className='cursor-pointer'
                onClick={() => {
                  toggleMoreOptions()
                }}
              >
                <MdMoreHoriz className='text-2xl' />
              </div>
              {isMoreOptions && (
                <div className='z-[1] bg-white shadow-md min-w-[180px] absolute top-[1.375rem] right-0 rounded-lg py-2'>
                  <div
                    className='px-2 flex items-center hover:bg-slate-100 active:bg-slate-200'
                    onClick={editPost}
                  >
                    <BiEdit className='text-lg' />
                    <p className='text-sm px-2 py-3 cursor-pointer'>
                      Edit post
                    </p>
                  </div>
                  <div
                    className='px-2 flex items-center text-red-600 hover:bg-slate-100 active:bg-slate-200'
                    onClick={deletePost}
                  >
                    <MdDelete className='text-lg' />
                    <p className='text-sm px-2 py-3 cursor-pointer'>
                      Delete post
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
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
