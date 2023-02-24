import Link from 'next/link'
import { useRouter } from 'next/router'
import React, { useCallback, useEffect, useState } from 'react'
import { MdAdd } from 'react-icons/md'
import { useAppDispatch, useAppSelector } from 'store/hooks'
import { removeAllPosts } from 'store/slices/notification.slice'

interface TickerProps {
  onActivePageChange: (page: string) => void
}

function Ticker({ onActivePageChange }: TickerProps) {
  const router = useRouter()
  const dispatch = useAppDispatch()

  const { selectedAccount } = useAppSelector(state => state.auth)

  const newPostsNotification = useAppSelector(
    state => state.notificaiton.newPosts
  )

  const totalPostsCount = newPostsNotification?.length || 0

  const [showPostsNotification, setShowPostsNotification] =
    useState<boolean>(false)

  const removePosts = useCallback(
    () => dispatch(removeAllPosts()),
    [dispatch]
  )

  const redirectToCreatePostPage = () => router.push('/post/create')

  useEffect(() => {
    const notificationInterval = setInterval(() => {
      setShowPostsNotification(true)

      // dismiss after 5 seconds
      setTimeout(() => {
        removePosts()
        setShowPostsNotification(false)
      }, 5000)
    }, 30000)

    return () => clearInterval(notificationInterval)
  }, [removePosts])

  return (
    <div className={`${'mb-2 h-6'}`}>
      <div
        className={`w-full fixed left-0 right-0 transition-all duration-500 z-[2] grid grid-cols-3 items-center justify-between px-4 min-h-[1.5rem] bg-gray-900 overflow-hidden py-1`}
      >
        <div>
          {showPostsNotification && totalPostsCount > 0 && (
            <h1
              onClick={() => onActivePageChange('explore')}
              className='cursor-pointer text-xs text-white flex items-center flex-wrap gap-x-1'
            >
              <span>
                {totalPostsCount} user{totalPostsCount > 1 ? 's' : ''}{' '}
                just posted{' '}
                <Link
                  className='text-blue-100 underline'
                  href='/post/create'
                >
                  (+) Post
                </Link>
              </span>
            </h1>
          )}
        </div>

        <Link className='text-white text-sm m-auto ' href='/explore'>
          Explore
        </Link>

        <div className='ml-auto'>
          {selectedAccount && (
            <div
              className='flex items-center justify-center bg-yellow-400 cursor-pointer rounded-full px-2 py-[3px] text-gray-900 font-semibold'
              onClick={redirectToCreatePostPage}
            >
              <MdAdd className='text-md' />
              <span className='text-xs'>Add Post</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Ticker
