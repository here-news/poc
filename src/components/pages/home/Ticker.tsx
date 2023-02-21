import Link from 'next/link'
import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'
import { useAppDispatch, useAppSelector } from 'store/hooks'
import {
  INewPostData,
  removeNewPost
} from 'store/slices/notification.slice'

interface TickerProps {
  changeActivePage: (page: string) => void
}

function Ticker({ changeActivePage }: TickerProps) {
  const dispatch = useAppDispatch()

  const newPostsNotification = useAppSelector(
    state => state.notificaiton.newPosts
  )
  const [showTicker, setShowTicker] = useState(false)
  const [activePost, setActivePost] = useState<INewPostData | null>(
    null
  )

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const removeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const showTimerRef = useRef<NodeJS.Timeout | null>(null)

  const toggleTicker = (state: boolean) => setShowTicker(state)
  const removePost = useCallback(
    (postId: string) => {
      if (postId) {
        dispatch(
          removeNewPost({
            postId
          })
        )
        setActivePost(null)
      }
    },
    [dispatch]
  )

  useEffect(() => {
    if (
      newPostsNotification &&
      newPostsNotification.length > 0 &&
      !activePost
    ) {
      const firstPost = newPostsNotification[0]
      toggleTicker(true)
      setActivePost(firstPost)

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        toggleTicker(false)
        if (removeTimerRef.current)
          clearTimeout(removeTimerRef.current)

        removeTimerRef.current = setTimeout(() => {
          removePost(firstPost.postId)
        }, 1000)
      }, 4000)
    }
  }, [newPostsNotification, activePost, removePost])

  return (
    <div className={`${showTicker ? 'mb-2 h-6' : ''}`}>
      <div
        className={`fixed left-0 right-0 transition-all duration-500 z-[2]`}
        style={{
          top: showTicker ? 56 : 32
        }}
      >
        <div className='py-1 flex-1 flex items-center justify-center px-4 min-h-[1.5rem] bg-gray-900 overflow-hidden'>
          {activePost && (
            <Link href='/explore'>
              <h1
                onClick={() => changeActivePage('explore')}
                className='cursor-pointer text-xs text-white flex items-center flex-wrap gap-x-1'
              >
                <span>
                  {activePost.user?.displayName} has posted{' '}
                </span>
                <span className='max-w-[30vw] truncate inline-block'>
                  {activePost.title}.
                </span>
                <span className='font-bold underline mb-[1px]'>
                  Explore
                </span>
              </h1>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default Ticker
