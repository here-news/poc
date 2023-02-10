import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
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

interface MinifiedPostProps extends IPost {
  index: number
}

function MinifiedPost({
  index,
  _id,
  createdAt,
  userId,
  title,
  totalVotes,
  upvotes
}: MinifiedPostProps) {
  const queryClient = useQueryClient()
  const dispatch = useAppDispatch()
  const selectedAccount = useAppSelector(
    state => state.auth.selectedAccount
  )

  const [votes, setVotes] = useState(totalVotes)
  const [isUpvoted, setIsUpvoted] = useState(false)

  const accountId = useMemo(
    () => selectedAccount && selectedAccount._id,
    [selectedAccount]
  )

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

    setVotes(prev => prev + 1)
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

  return (
    <div className='flex flex-row items-center gap-4 relative border-[0.0625rem] border-slate-400 bg-white p-4 w-full'>
      <p>{index}</p>
      <div className='cursor-pointer' onClick={handleUpvote}>
        {isUpvoted ? (
          <BsLightningFill className='w-7 h-7 text-yellow-500' />
        ) : (
          <BsLightning className='w-7 h-7' />
        )}
      </div>
      <div className='flex flex-col'>
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
            <span>3 comments</span>
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
    </div>
  )
}

export default MinifiedPost
