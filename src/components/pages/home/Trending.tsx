import React, {
  useEffect,
  useState,
  useRef,
  useCallback
} from 'react'
import Head from 'next/head'
import axios from 'axios'
import { useInfiniteQuery } from 'react-query'
import { BiLoaderAlt } from 'react-icons/bi'
import Masonry from 'react-masonry-css'

import { useAppSelector } from 'store/hooks'
import { IPost } from 'types/interfaces'
import { ENV } from 'lib/env'

import ShowImagesModal from './ShowImagesModal'
import SinglePost from 'components/SinglePost/SinglePost'
import EditPostModal from './EditPostModal/EditPostModal'

const breakpointColumnsObj = {
  default: 4,
  1150: 3,
  850: 2,
  580: 1
}

function Trending() {
  const limit = 30

  const observerElem = useRef(null)
  const selectedAccount = useAppSelector(
    state => state.auth.selectedAccount
  )

  const [selectedPost, setSelectedPost] = useState<IPost | null>(null)
  const [isEditPostModalVisible, setIsEditPostModalVisible] =
    useState(false)
  const [showImagesVisible, setShowImagesVisible] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [initialImageIndex, setInitialImageIndex] =
    useState<number>(0)

  useEffect(() => {
    if (!isEditPostModalVisible) {
      setSelectedPost(null)
    }
  }, [isEditPostModalVisible])

  const handleSelectedPost = (post?: IPost) => {
    if (!post) return setSelectedPost(null)
    setSelectedPost(post)
  }

  const handleSelectedImages = (images: string[], index?: number) => {
    setSelectedImages(images)
    setInitialImageIndex(index ? index : 0)
    toggleShowImagesVisible()
  }

  const toggleEditPostModal = () =>
    setIsEditPostModalVisible(prev => !prev)

  const toggleShowImagesVisible = () =>
    setShowImagesVisible(prev => !prev)

  const fetchTrendingPosts = async (page: number) => {
    const response = await axios.get(
      `${ENV.API_URL}/getTrendingPosts?per_page=${limit}&page=${page}`
    )
    return {
      result: response.data.data
    }
  }

  const {
    data,
    isSuccess,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useInfiniteQuery(
    'getTrendingPosts',
    ({ pageParam = 1 }) => fetchTrendingPosts(pageParam),
    {
      getNextPageParam: (lastPage, allPages) => {
        const nextPage: number = allPages.length + 1
        return lastPage.result.length === limit ? nextPage : undefined
      }
    }
  )

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries
      if (target.isIntersecting && hasNextPage) {
        fetchNextPage()
      }
    },
    [fetchNextPage, hasNextPage]
  )

  useEffect(() => {
    if (!observerElem.current) return
    const element: HTMLDivElement = observerElem.current
    const option = { threshold: 0 }

    const observer = new IntersectionObserver(handleObserver, option)
    observer.observe(element)
    return () => observer.unobserve(element)
  }, [fetchNextPage, hasNextPage, handleObserver])

  return (
    <div className='relative w-full px-2 md:px-0 mb-8'>
      <Head>
        <title>Trending - Here News</title>
      </Head>

      <React.Fragment>
        <div className='px-4'>
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className='trending'
            columnClassName='trending_column'
          >
            {isSuccess &&
              data &&
              data.pages &&
              data.pages.map(
                page =>
                  page &&
                  page.result &&
                  page.result.map((post: IPost, i: number) => (
                    <div key={post._id} className='w-full mt-4'>
                      <SinglePost
                        {...post}
                        handleSelectedImages={handleSelectedImages}
                        toggleEditPostModal={toggleEditPostModal}
                        handleSelectedPost={handleSelectedPost}
                        canPushToPost={true}
                        totalComments={
                          post.replies ? post.replies.length : 0
                        }
                        preview={post.preview}
                        showMore
                      />
                    </div>
                  ))
              )}
          </Masonry>
          {hasNextPage && (
            <div
              className='my-4 w-full z-[1] loader'
              ref={observerElem}
            >
              <div className='flex items-center justify-center z-[1]'>
                <p className='text-white text-sm bg-black px-3 py-2 rounded-lg font-semibold flex flex-row items-center'>
                  {!isFetchingNextPage ? (
                    'Load more news...'
                  ) : (
                    <React.Fragment>
                      <span className='animate-spin rotate mr-2'>
                        <BiLoaderAlt color='white' />
                      </span>
                      Loading news...
                    </React.Fragment>
                  )}
                </p>
              </div>
            </div>
          )}
          <EditPostModal
            isVisible={isEditPostModalVisible}
            toggleVisible={toggleEditPostModal}
            post={selectedPost}
          />
          <ShowImagesModal
            showImagesVisible={showImagesVisible}
            toggleShowImagesVisible={toggleShowImagesVisible}
            images={selectedImages}
            initialIndex={initialImageIndex}
          />
        </div>
      </React.Fragment>
    </div>
  )
}

export default Trending
