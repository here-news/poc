import React, { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import formatDistance from 'date-fns/formatDistance'
import AnimatedNumber from 'react-awesome-animated-number'
import { BsLightning, BsLightningFill } from 'react-icons/bs'
import { useMutation, useQueryClient } from 'react-query'
import { toast } from 'react-toastify'

import { ENV } from 'lib/env'
import { useAppDispatch, useAppSelector } from 'store/hooks'
import {
  deductBalance,
  toggleIsLoginModalVisible
} from 'store/slices/auth.slice'
import { IPost } from 'types/interfaces'

import 'react-awesome-animated-number/dist/index.css'
import { MdDelete, MdMoreHoriz } from 'react-icons/md'
import { BiEdit } from 'react-icons/bi'

interface MinifiedPostProps extends IPost {
  index: number
  toggleEditPostModal: () => void
  handleSelectedPost: (post: IPost) => void
}

function MinifiedPost({
  index,
  _id,
  createdAt,
  userId,
  title,
  totalVotes,
  downvotes,
  upvotes,
  totalComments,
  images,
  preview,
  text,
  handleSelectedPost,
  toggleEditPostModal
}: MinifiedPostProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const dispatch = useAppDispatch()
  const selectedAccount = useAppSelector(
    state => state.auth.selectedAccount
  )

  const moreOptionsMenuRef = useRef<HTMLDivElement | null>(null)

  const [voted, setVoted] = useState<'upvote' | 'downvote' | null>(
    null
  )
  const [votes, setVotes] = useState(totalVotes)
  const [isUpvoted, setIsUpvoted] = useState(false)
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

  const accountId = useMemo(
    () => selectedAccount && selectedAccount._id,
    [selectedAccount]
  )

  useEffect(() => {
    if (accountId) {
      if (upvotes && upvotes.length && upvotes.includes(accountId))
        setVoted('upvote')
      else if (
        downvotes &&
        downvotes.length &&
        downvotes.includes(accountId)
      )
        setVoted('downvote')
      else setVoted(null)
    } else {
      setVoted(null)
    }
  }, [accountId, upvotes, downvotes])

  useEffect(() => {
    setVotes(totalVotes)
  }, [totalVotes])

  useEffect(() => {
    if (accountId) {
      if (upvotes && upvotes.includes(accountId)) setIsUpvoted(true)
      else setIsUpvoted(false)
    } else {
      setIsUpvoted(false)
    }
  }, [accountId, upvotes])

  const handleUpvote = () => {
    if (!accountId) {
      dispatch(toggleIsLoginModalVisible(true))
      return
    }
    if (isUpvoted || !accountId) return

    setVotes(prev =>
      voted === 'downvote' ? (prev ? prev + 2 : prev + 1) : prev + 1
    )
    setIsUpvoted(true)
    handleUpvoteQuery.mutate({
      userId: accountId
    })
  }

  const handleUpvoteQuery = useMutation(
    (data: { userId: string }) => {
      return axios.post(`${ENV.API_URL}/upvotePost/${_id}`, data)
    },
    {
      onSuccess: () => {
        dispatch(deductBalance(0.01))
        queryClient.invalidateQueries('getExplorePosts')
      },
      onError: () => {
        toast.error('Error upvoting!')
      }
    }
  )

  const deletePostQuery = useMutation(
    () => {
      return axios.delete(`${ENV.API_URL}/deletePost/${_id}`)
    },
    {
      onSuccess: () => {
        toast.success('Successfully deleted post!')
        queryClient.invalidateQueries('getExplorePosts')
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
      onClick={() => router.push(`/post/${_id}`)}
      className='cursor-pointer'
    >
      <div className='flex flex-row items-center gap-4 relative border-[0.0625rem] border-slate-400 bg-white p-4 w-full'>
        <p>{index}</p>
        <div
          className='cursor-pointer'
          onClick={e => {
            e.stopPropagation()
            handleUpvote()
          }}
        >
          {isUpvoted ? (
            <BsLightningFill className='w-7 h-7 text-yellow-500' />
          ) : (
            <BsLightning className='w-7 h-7' />
          )}
        </div>
        <div className='flex flex-col flex-1'>
          <div className='text-sm font-bold'>
            <p>{title ? title : 'No title'}</p>
          </div>
          <div className='flex flex-row gap-1 text-slate-600 text-xs items-center'>
            <p>
              <AnimatedNumber
                className='select-none text-slate-600'
                value={votes || 0}
                hasComma={false}
                size={12}
              />
              <span className='px-1'>\</span>
              <span>
                {totalComments}{' '}
                {totalComments && totalComments > 1
                  ? 'comments'
                  : 'comment'}
              </span>
              <span className='px-1'>\</span>
              <span className='text-blue-600'>
                @{userId.displayName}
              </span>
              <span className='px-1'>\</span>
              <span>
                {formatDistance(new Date(createdAt), new Date(), {
                  addSuffix: true
                })}
              </span>
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
    </div>
  )
}

export default MinifiedPost
