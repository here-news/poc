import React, { useLayoutEffect, useMemo } from 'react'
import { useQuery } from 'react-query'
import axios from 'axios'

import { ENV } from 'lib/env'
import { IComment } from 'types/interfaces'

import AddComment from './AddComment'
import SingleComment from './SingleComment'
import { useAppDispatch, useAppSelector } from 'store/hooks'
import {
  toggleIsLoginModalVisible,
  toggleIsRegisterModalVisible
} from 'store/slices/auth.slice'

interface CommentsProps {
  postId: string
  totalComments: number | undefined
}
function Comments({ postId, totalComments }: CommentsProps) {
  const dispatch = useAppDispatch()
  const selectedAccount = useAppSelector(
    state => state.auth.selectedAccount
  )

  useLayoutEffect(() => {
    const hash = window.location.hash
    if (hash === '#conversation') {
      const element = document.getElementById('conversation')
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [])

  const getCommentsQuery = useQuery(
    'getCommentsFromPost',
    () => {
      return axios.get(`${ENV.API_URL}/getCommentsFromPost/${postId}`)
    },
    {
      refetchOnWindowFocus: false,
      cacheTime: Infinity
    }
  )

  const forceFetchQuery = () => {
    getCommentsQuery.refetch()
  }

  const commentsList: IComment[] = useMemo(() => {
    return (
      getCommentsQuery.data &&
      getCommentsQuery.data.data &&
      getCommentsQuery.data.data.data
    )
  }, [getCommentsQuery.data])

  const openLoginModal = () => {
    dispatch(toggleIsLoginModalVisible(true))
  }

  const openRegisterModal = () => {
    dispatch(toggleIsRegisterModalVisible(true))
  }

  return (
    <div className='mt-8 mb-20' id='conversation'>
      <h3 className='text-2xl font-semibold text-slate-700'>
        Conversation{' '}
        {totalComments && totalComments > 0 ? (
          <span className='text-sm ml-1 text-slate-500'>
            {totalComments}{' '}
            {totalComments === 1 ? 'Comment' : 'Comments'}
          </span>
        ) : (
          ''
        )}
      </h3>
      <div className='bg-slate-300 h-[0.0625rem] w-full my-4' />
      <p className='text-slate-600 text-md'>
        Discussions are moderated for civility. We are working to
        resolve bugs and fine-tune the system. Read our Getting
        Started Guide & Content Rules here.
      </p>
      <div className='mt-8 flex flex-row justify-between items-center'>
        <p className='font-semibold text-sm'>
          {selectedAccount && selectedAccount.displayName
            ? selectedAccount.displayName
            : ''}
        </p>

        {!selectedAccount && (
          <div className='flex flex-row text-sm items-center text-slate-700'>
            <p
              className='pr-2 border-r-[0.0625rem] border-slate-300 cursor-pointer'
              onClick={openLoginModal}
            >
              Login
            </p>
            <p
              className='pl-2 cursor-pointer'
              onClick={openRegisterModal}
            >
              Register
            </p>
          </div>
        )}
      </div>
      <AddComment
        postId={postId}
        forceFetchQuery={forceFetchQuery}
        totalComments={
          commentsList && commentsList.length > 0
            ? commentsList.length
            : 0
        }
      />

      {commentsList && commentsList.length > 0 && (
        <React.Fragment>
          <div className='mt-8 flex flex-col gap-6'>
            {commentsList.map(comment => (
              <SingleComment
                key={comment._id}
                _id={comment._id}
                commentId={comment._id}
                post={comment.post}
                text={comment.text}
                user={comment.user}
                createdAt={comment.createdAt}
                replies={comment.replies}
              />
            ))}
          </div>
        </React.Fragment>
      )}
    </div>
  )
}

export default Comments
