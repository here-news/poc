import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import formatDistance from 'date-fns/formatDistance'
import { BiEdit } from 'react-icons/bi'
import { MdDelete, MdMoreHoriz } from 'react-icons/md'
import { useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import { toast } from 'react-toastify'

import { IPost } from 'types/interfaces'
import { useAppSelector } from 'store/hooks'
import { ENV } from 'lib/env'

import VotesCounter from './VotesCounter'
import Images from './Images'
import Buttons from './Buttons'
import LinkDetails from './LinkDetails'
import Avatar from 'components/Avatar'

import styles from './SinglePost.module.css'

interface SinglePostProps extends IPost {
  noBorder?: boolean
  canPushToPost?: boolean
  totalComments: number
  showDetails?: boolean
  showMore?: boolean
  showVoting?: boolean
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
  preview,
  showMore,
  showVoting,
  showDetails
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
      {showDetails && (
        <div className='flex flex-row justify-between items-center mx-4'>
          <div className='flex items-center flex-1 min-h-10'>
            {showVoting && (
              <div onClick={e => e.stopPropagation()}>
                <VotesCounter
                  postId={_id}
                  downvotes={downvotes}
                  upvotes={upvotes}
                  totalVotes={totalVotes}
                />
              </div>
            )}
            <Avatar
              imageUrl={userId.avatar}
              containerClassNames={`w-8 h-8 ${
                showVoting ? 'ml-2' : 'mt-2'
              }`}
              bg='dark'
            />
            <div
              className={`flex flex-col flex-1 ${
                showVoting ? 'ml-2' : 'ml-2 mt-2'
              }`}
            >
              <h4 className='text-md'>{userId.displayName}</h4>
              <p className='text-xs text-slate-500'>
                {formatDistance(new Date(createdAt), new Date(), {
                  addSuffix: true
                })}
              </p>
            </div>
          </div>
          <div>
            {selectedAccount &&
              selectedAccount._id === userId._id && (
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
      )}
      <div>
        {text && (
          <div
            className={`flex flex-col mt-4 mx-4 ${
              !images || (images && images.length <= 0)
                ? 'mb-4'
                : height !== '100px'
                ? 'mb-4'
                : ''
            }`}
          >
            <h2 className='text-lg font-bold mb-4 break-all'>
              {title}
            </h2>
            <div
              className={`break-all ${styles.description} pb-4`}
              dangerouslySetInnerHTML={{
                __html: text
              }}
              ref={contentRef}
              style={
                showMore
                  ? { maxHeight: height, overflow: 'hidden' }
                  : {}
              }
            />
          </div>
        )}
        {preview && (
          <div className='mt-2 mb-4'>
            <LinkDetails
              url={preview.url}
              description={preview.description}
              favicons={preview.favicons}
              images={preview.images}
              siteName={preview.siteName}
              title={preview.title}
              youtubeId={preview.youtubeId}
            />
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
