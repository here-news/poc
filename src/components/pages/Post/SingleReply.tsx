import React, { useEffect, useRef, useState } from 'react'
import formatDistance from 'date-fns/formatDistance'
import { BiEdit } from 'react-icons/bi'
import { MdDelete, MdMoreHoriz } from 'react-icons/md'
import { GoPrimitiveDot } from 'react-icons/go'
import axios from 'axios'
import { useMutation, useQueryClient } from 'react-query'
import { toast } from 'react-toastify'
import { useRouter } from 'next/router'

import { IPost } from 'types/interfaces'
import { useAppSelector } from 'store/hooks'
import { ENV } from 'lib/env'

import VotesCounter from '../../SinglePost/VotesCounter'
import Buttons from '../../SinglePost/Buttons'
import Avatar from 'components/Avatar'
import LinkDetails from 'components/SinglePost/LinkDetails'
import Images from 'components/SinglePost/Images'

import styles from '../../SinglePost/SinglePost.module.css'

interface SingleReplyProps extends IPost {
  noBorder?: boolean
  canPushToPost?: boolean
  totalComments: number
  hasLine?: boolean
  isSeperate?: boolean
  handleSelectedImages: (images: string[], index?: number) => void
  toggleEditPostModal: () => void
  handleSelectedPost: (post: IPost, isReply?: boolean) => void
}

function SingleReply({
  _id,
  userId,
  createdAt,
  text,
  upvotes,
  downvotes,
  totalVotes,
  preview,
  images,
  noBorder,
  canPushToPost,
  totalComments,
  hasLine,
  isSeperate,
  handleSelectedImages,
  toggleEditPostModal,
  handleSelectedPost
}: SingleReplyProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
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

  const deletePostQuery = useMutation(
    () => {
      return axios.delete(`${ENV.API_URL}/deletePost/${_id}`)
    },
    {
      onSuccess: () => {
        toast.success('Successfully deleted post!')
        queryClient.invalidateQueries('getSinglePost')
        queryClient.invalidateQueries('getReplies')
      },
      onError: () => {
        toast.error('There was some error deleting post!')
      }
    }
  )

  const editPost = () => {
    handleSelectedPost(
      {
        _id,
        createdAt,
        downvotes,
        totalVotes,
        upvotes,
        userId,
        images,
        preview,
        text,
        totalComments
      },
      true
    )

    toggleEditPostModal()
  }

  const deletePost = () => {
    deletePostQuery.mutate()
  }

  const moveToPage = () => {
    canPushToPost && router.push(`/post/${_id}`)
  }

  return (
    <div
      className={`relative bg-white w-full ${
        !noBorder ? 'border-[0.0625rem] border-slate-400' : ''
      } 
      ${isSeperate ? 'my-4' : ''}
      ${
        canPushToPost
          ? 'cursor-pointer transition-colors duration-300 hover:bg-slate-100'
          : ''
      }`}
      onClick={moveToPage}
    >
      <div className='flex flex-row'>
        {!isSeperate && (
          <div className='relative flex flex-col items-center w-4 z-[1] mx-2'>
            <div className='absolute top-0 left-0 min-h-[64px] flex items-center justify-center'>
              <GoPrimitiveDot className='text-gray-300 text-lg' />
            </div>

            {hasLine && (
              <div className='border-l-[2px] border-gray-300 h-[100%] absolute top-7 left-2' />
            )}
          </div>
        )}
        <div className='flex-1'>
          <div
            className={`flex flex-row justify-between items-center ${
              isSeperate ? 'mx-4' : 'mr-4'
            }`}
          >
            <div className='flex items-center flex-1 min-h-10'>
              <div onClick={e => e.stopPropagation()}>
                <VotesCounter
                  postId={_id}
                  downvotes={downvotes}
                  upvotes={upvotes}
                  totalVotes={totalVotes}
                />
              </div>
              <Avatar
                imageUrl={userId.avatar}
                containerClassNames='w-8 h-8 ml-2'
                bg='dark'
              />
              <div className='flex flex-col flex-1 ml-2'>
                <h4 className='text-md'>{userId?.displayName}</h4>
                <p className='text-xs text-slate-500'>
                  {formatDistance(new Date(createdAt), new Date(), {
                    addSuffix: true
                  })}
                </p>
              </div>
            </div>
            <div>
              {selectedAccount &&
                selectedAccount._id === userId?._id && (
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
                      <div className='z-[1] bg-white shadow-lg min-w-[7.5rem] absolute top-[1.375rem] right-0 rounded-lg py-2'>
                        <div
                          className='px-2 flex items-center hover:bg-slate-100 active:bg-slate-200'
                          onClick={editPost}
                        >
                          <BiEdit className='text-lg' />
                          <p className='text-sm px-2 py-3 cursor-pointer'>
                            Edit
                          </p>
                        </div>
                        <div
                          className='px-2 flex items-center text-red-600 hover:bg-slate-100 active:bg-slate-200'
                          onClick={deletePost}
                        >
                          <MdDelete className='text-lg' />
                          <p className='text-sm px-2 py-3 cursor-pointer'>
                            Delete
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
          <div>
            {text && (
              <div className='flex flex-col mt-4 mx-4'>
                <div
                  className={`break-all ${styles.description} pb-4`}
                  dangerouslySetInnerHTML={{
                    __html: text
                  }}
                  ref={contentRef}
                  style={{ maxHeight: height, overflow: 'hidden' }}
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
                  type='compact'
                />
              </div>
            )}
            <div
              className='flex-1'
              onClick={e => e.stopPropagation()}
            >
              <Images
                images={images}
                handleSelectedImages={handleSelectedImages}
              />
            </div>

            <Buttons totalComments={totalComments} postId={_id} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SingleReply
