import Link from 'next/link'
import React, { useCallback, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from 'store/hooks'
import { removeAllPosts } from 'store/slices/notification.slice'

interface TickerProps {
  changeActivePage: (page: string) => void
}

function Ticker({ changeActivePage }: TickerProps) {
  const dispatch = useAppDispatch()

  const newPostsNotification = useAppSelector(
    (state) => state.notificaiton.newPosts
  )

  const totalPostsCount = newPostsNotification?.length || 0

  const [showPostsNotification, setShowPostsNotification] =
    useState<boolean>(false)

  const removePosts = useCallback(
    () => dispatch(removeAllPosts()),
    [dispatch]
  )

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
        className={`fixed left-0 right-0 transition-all duration-500 z-[2]`}
      >
        <div className="relative py-1 flex-1 flex items-center justify-center px-4 min-h-[1.5rem] bg-gray-900 overflow-hidden">
          <Link className="text-white" href="/explore">
            Explore
          </Link>
          {showPostsNotification && totalPostsCount > 0 && (
            <h1
              onClick={() => changeActivePage('explore')}
              className="absolute cursor-pointer text-xs text-white flex items-center flex-wrap gap-x-1 right-3"
            >
              <span>
                {totalPostsCount} user{totalPostsCount > 1 ? 's' : ''}{' '}
                just posted{' '}
                <Link
                  className="text-blue-100 underline"
                  href="/post/create"
                >
                  (+) Post
                </Link>
              </span>
            </h1>
          )}
        </div>
      </div>
    </div>
  )
}

export default Ticker
