import React, { useEffect, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from 'store/hooks'
import {
  BsCaretDown,
  BsCaretUp,
  BsCaretDownFill,
  BsCaretUpFill
} from 'react-icons/bs'
import AnimatedNumber from 'react-awesome-animated-number'
import 'react-awesome-animated-number/dist/index.css'
import { useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import { ENV } from 'lib/env'
import { toast } from 'react-toastify'
import {
  deductBalance,
  toggleIsLoginModalVisible
} from 'store/slices/auth.slice'

interface VotesCounterProps {
  postId: string
  upvotes: string[]
  downvotes: string[]
  totalVotes: number
}

function VotesCounter({
  postId,
  upvotes,
  downvotes,
  totalVotes
}: VotesCounterProps) {
  const queryClient = useQueryClient()
  const dispatch = useAppDispatch()
  const selectedAccount = useAppSelector(
    state => state.auth.selectedAccount
  )
  const [isVoteChanged, setIsVoteChanged] = useState(false)
  const [votes, setVotes] = useState(totalVotes)
  const [voted, setVoted] = useState<'upvote' | 'downvote' | null>(
    null
  )

  const accountId = useMemo(
    () => selectedAccount && selectedAccount._id,
    [selectedAccount]
  )

  useEffect(() => {
    setVotes(totalVotes)
  }, [totalVotes])

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

  const handleUpvote = () => {
    if (!accountId) {
      dispatch(toggleIsLoginModalVisible(true))
      return
    }
    if (voted === 'upvote') return

    setIsVoteChanged(true)
    setVotes(prev =>
      voted === 'downvote' ? (prev ? prev + 2 : prev + 1) : prev + 1
    )
    setVoted('upvote')
    handleUpvoteQuery.mutate({
      userId: accountId
    })
    setTimeout(() => setIsVoteChanged(false), 2000)
  }
  const handleDownvote = () => {
    if (!accountId) {
      dispatch(toggleIsLoginModalVisible(true))
      return
    }
    if (voted === 'downvote') return

    setIsVoteChanged(true)
    setVotes(prev =>
      voted === 'upvote' ? (prev ? prev - 2 : prev - 1) : prev - 1
    )

    setVoted('downvote')
    handleDownvoteQuery.mutate({
      userId: accountId
    })
    setTimeout(() => setIsVoteChanged(false), 2000)
  }

  const handleUpvoteQuery = useMutation(
    (data: { userId: string }) => {
      return axios.post(`${ENV.API_URL}/upvotePost/${postId}`, data)
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

  const handleDownvoteQuery = useMutation(
    (data: { userId: string }) => {
      return axios.post(`${ENV.API_URL}/downvotePost/${postId}`, data)
    },
    {
      onSuccess: () => {
        dispatch(deductBalance(0.01))
        queryClient.invalidateQueries('getExplorePosts')
      },
      onError: () => {
        toast.error('Error downvoting!')
      }
    }
  )

  return (
    <div className='flex flex-col justify-center items-center'>
      <div
        className={`cursor-pointer transition ease-in-out click:-translate-y-1 active:scale-50
    ${voted === 'upvote' ? 'text-green-600' : 'text-black'}`}
        onClick={handleUpvote}
      >
        {voted === 'upvote' ? (
          <BsCaretUpFill className='w-6 h-6' />
        ) : (
          <BsCaretUp className='w-6 h-6' />
        )}
      </div>
      <AnimatedNumber
        className={`select-none transition duration-100 ease-in-out ${
          isVoteChanged
            ? voted === 'downvote'
              ? 'text-red-600'
              : 'text-green-600'
            : 'text-black'
        }`}
        value={votes}
        hasComma={false}
        size={16}
      />
      <div
        className={`cursor-pointer transition ease-in-out click:-translate-y-1 active:scale-50
  ${voted === 'downvote' ? 'text-red-600' : 'text-black'}`}
        onClick={handleDownvote}
      >
        {voted === 'downvote' ? (
          <BsCaretDownFill className='w-6 h-6' />
        ) : (
          <BsCaretDown className='w-6 h-6' />
        )}
      </div>
    </div>
  )
}

export default VotesCounter
