import React, { useRef, useState } from 'react'
import styles from './Comments.module.css'
import Avatar from 'assets/avatar.png'
import Image from 'next/image'
import { useAppDispatch, useAppSelector } from 'store/hooks'
import { useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import { ENV } from 'lib/env'
import { toast } from 'react-toastify'
import { deductBalance } from 'store/slices/auth.slice'

interface AddCommentProps {
  isReply?: boolean
  postId: string
  commentId?: string
  replyTo?: string
  toggleReplyShown?: () => void
  forceFetchQuery?: () => void
  totalComments?: number
}

const AddComment = ({
  postId,
  isReply,
  commentId,
  replyTo,
  toggleReplyShown,
  forceFetchQuery,
  totalComments
}: AddCommentProps) => {
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  const commentRef = useRef<HTMLDivElement | null>(null)
  const [hasFocus, setHasFocus] = useState(false)

  const selectedAccount = useAppSelector(
    state => state.auth.selectedAccount
  )

  const toggleHasFocus = () => setHasFocus(prev => !prev)

  const addComment = useMutation(
    (data: { userId: string; text: string }) => {
      return axios.post(
        isReply
          ? `${ENV.API_URL}/addCommentReply/${postId}/${commentId}`
          : `${ENV.API_URL}/addComment/${postId}`,
        data
      )
    },
    {
      onSuccess: () => {
        if (!commentRef.current) return
        if (isReply && toggleReplyShown) toggleReplyShown()
        dispatch(deductBalance(0.01))

        if (
          !isReply &&
          forceFetchQuery &&
          totalComments &&
          totalComments === 0
        )
          forceFetchQuery()

        queryClient.invalidateQueries('getCommentsFromPost')
        commentRef.current.innerHTML = ''
      },
      onError: () => {
        toast.error('There was some error posting comment!')
      }
    }
  )

  const handleAddComment = async () => {
    if (!commentRef.current || !selectedAccount) return

    const sanitize = await import('sanitize-html')

    addComment.mutate({
      text: sanitize.default(commentRef.current.innerHTML),
      userId: selectedAccount._id
    })
  }
  return (
    <React.Fragment>
      <div className='w-full mt-3 flex flex-row items-start'>
        <div
          className={`relative ${
            isReply ? 'w-6 h-6' : 'w-10 h-9'
          } mr-4`}
        >
          <Image
            src={Avatar}
            fill
            alt='user avatar'
            className='rounded-full'
          />
        </div>
        <div
          ref={commentRef}
          className={`${
            styles.comments_editor
          } group text-sm overflow-x-hidden overflow-y-auto ${
            hasFocus ||
            (commentRef.current && commentRef.current.innerHTML)
              ? 'min-h-[4.5rem]'
              : 'min-h-[2.5rem]'
          } max-h-[15.625rem] border-[0.0625rem]  rounded-md py-2 px-3 w-full outline-none ${
            selectedAccount
              ? 'bg-white border-slate-400'
              : 'bg-slate-200 border-slate-300'
          }`}
          contentEditable={selectedAccount ? true : false}
          placeholder={
            isReply
              ? `Reply to ${replyTo}`
              : 'Be the first one to comment!'
          }
          onFocus={() => selectedAccount && toggleHasFocus()}
          onBlur={() => selectedAccount && toggleHasFocus()}
        />
      </div>
      {selectedAccount && (
        <div
          className={`${
            hasFocus ||
            (commentRef.current && commentRef.current.innerHTML)
              ? 'flex'
              : 'hidden'
          } 
        flex-row justify-end mt-3`}
        >
          <div
            className={`cursor-pointer transition duration-500 ease-in-out text-sm ${
              addComment.isLoading ? 'bg-slate-600' : 'bg-blue-600'
            } px-4 py-2 rounded-md text-white flex justify-center items-center`}
            onClick={() =>
              !addComment.isLoading &&
              commentRef.current &&
              commentRef.current.innerHTML &&
              handleAddComment()
            }
          >
            <p className='text-sm'>
              {addComment.isLoading ? 'Sending...' : 'Send'}
            </p>
          </div>
        </div>
      )}
    </React.Fragment>
  )
}

export default AddComment
