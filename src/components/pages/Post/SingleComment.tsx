import React, { useEffect, useMemo, useRef, useState } from 'react'
import { IComment, IPost, IUser } from 'types/interfaces'
import Avatar from 'assets/avatar.png'
import Image from 'next/image'
import formatDistance from 'date-fns/formatDistance'
import { MdDelete, MdMoreHoriz } from 'react-icons/md'
import { useAppSelector } from 'store/hooks'
import { useMutation, useQueryClient } from 'react-query'
import { ENV } from 'lib/env'
import axios from 'axios'
import { toast } from 'react-toastify'
import AddComment from './AddComment'

interface SingleCommentProps extends IComment {
  commentId: string
  isReply?: boolean
}

function SingleComment({
  commentId,
  post,
  user,
  text,
  createdAt,
  replies,
  isReply
}: SingleCommentProps) {
  const queryClient = useQueryClient()
  const moreOptionsMenuRef = useRef<HTMLDivElement | null>(null)

  const selectedAccount = useAppSelector(
    state => state.auth.selectedAccount
  )
  const [isReplyShown, setIsReplyShown] = useState(false)
  const [hasAllRepliesShown, setHasAllRepliesShown] = useState(false)
  const [isMoreOptions, setIsMoreOptions] = useState(false)

  const toggleAllRepliesShow = () =>
    setHasAllRepliesShown(prev => !prev)
  const toggleReplyShown = () => setIsReplyShown(prev => !prev)
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

  const deleteComment = useMutation(
    () => {
      return axios.delete(`${ENV.API_URL}/deleteComment/${commentId}`)
    },
    {
      onSuccess: () => {
        toast.success('Successfully deleted comment!')
        queryClient.invalidateQueries('getCommentsFromPost')
      },
      onError: () => {
        toast.error('There was some error deleting comment!')
      }
    }
  )

  const handleDeleteComment = () => {
    deleteComment.mutate()
  }

  const filteredReplies = useMemo(() => {
    if (!replies) return []
    return hasAllRepliesShown ? replies : replies.slice(-2)
  }, [hasAllRepliesShown, replies])

  return (
    <div className='flex flex-row gap-2 items-start w-full'>
      <div className='relative w-8 h-8'>
        <Image
          fill
          src={Avatar}
          alt='comment user image'
          className='rounded-full'
        />
      </div>
      <div className='ml-2 flex-1'>
        <div className='flex flex-row justify-between'>
          <div className='flex flex-col'>
            <p className='text-sm font-semibold text-slate-700'>
              {user.displayName}
            </p>
          </div>
          {selectedAccount && selectedAccount._id === user._id && (
            <div className='relative' ref={moreOptionsMenuRef}>
              <div
                className='cursor-pointer'
                onClick={() => toggleMoreOptions()}
              >
                <MdMoreHoriz className='text-2xl' />
              </div>

              {isMoreOptions && (
                <div className='z-[1] bg-white shadow-md min-w-[180px] absolute top-[1.375rem] right-0 rounded-lg py-2 px-2'>
                  <div
                    className='flex items-center text-red-600'
                    onClick={handleDeleteComment}
                  >
                    <MdDelete className='text-lg' />
                    <p className='text-sm px-2 py-3 cursor-pointer '>
                      Delete comment
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <p className='text-xs text-slate-600'>
          {formatDistance(new Date(createdAt), new Date(), {
            addSuffix: true
          })}
        </p>
        <div
          className='mt-3'
          dangerouslySetInnerHTML={{
            __html: text
          }}
        />
        {!isReply && (
          <React.Fragment>
            <div className='pt-1 pb-3 inline-block'>
              <div
                className='cursor-pointer'
                onClick={toggleReplyShown}
              >
                <p className='text-xs text-blue-600 underline'>
                  Reply
                </p>
              </div>
            </div>
            {isReplyShown && (
              <AddComment
                isReply={true}
                postId={post._id}
                commentId={commentId}
                replyTo={user.displayName}
                toggleReplyShown={toggleReplyShown}
              />
            )}
          </React.Fragment>
        )}
        {!isReply &&
          replies &&
          replies.length > 2 &&
          !hasAllRepliesShown && (
            <p
              className='mt-2 text-sm underline text-blue-600 cursor-pointer'
              onClick={toggleAllRepliesShow}
            >
              Show Previous Thread
            </p>
          )}
        {filteredReplies.map(reply => (
          <div key={reply._id} className='mt-6'>
            <SingleComment
              _id={reply._id}
              commentId={reply._id}
              post={reply.post}
              text={reply.text}
              user={reply.user}
              createdAt={reply.createdAt}
              isReply={true}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default SingleComment
