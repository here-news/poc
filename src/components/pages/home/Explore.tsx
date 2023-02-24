import axios from 'axios'
import { ENV } from 'lib/env'
import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'
import { BiLoaderAlt } from 'react-icons/bi'
import { useInfiniteQuery } from 'react-query'
import { useAppSelector } from 'store/hooks'
import { IPost } from 'types/interfaces'
import EditPostModal from './EditPostModal/EditPostModal'
import MinifiedPost from './MinifiedPost'

function Explore() {
  const limit = 30

  const observerElem = useRef(null)
  const selectedAccount = useAppSelector(
    state => state.auth.selectedAccount
  )
  const [selectedPost, setSelectedPost] = useState<IPost | null>(null)
  const [isEditPostModalVisible, setIsEditPostModalVisible] =
    useState(false)

  useEffect(() => {
    if (!isEditPostModalVisible) {
      setSelectedPost(null)
    }
  }, [isEditPostModalVisible])

  const handleSelectedPost = (post?: IPost) => {
    if (!post) return setSelectedPost(null)
    setSelectedPost(post)
  }

  const toggleEditPostModal = () =>
    setIsEditPostModalVisible(prev => !prev)

  const fetchExplorePosts = async (page: number) => {
    const response = await axios.get(
      `${ENV.API_URL}/getExplorePosts?per_page=${limit}&page=${page}`
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
    ({ pageParam = 1 }) => fetchExplorePosts(pageParam),
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
    <div
      className={`w-full max-w-[40rem] px-2 md:px-0 ${
        selectedAccount ? 'mt-2' : ''
      }`}
    >
      {isSuccess &&
        data &&
        data.pages &&
        data.pages.map(
          (page, pageIndex) =>
            page &&
            page.result &&
            page.result.map((post: IPost, i: number) => {
              const newIndex = pageIndex * limit + i
              return (
                <div key={post._id} className='w-full mb-4'>
                  <MinifiedPost
                    {...post}
                    index={newIndex + 1}
                    toggleEditPostModal={toggleEditPostModal}
                    handleSelectedPost={handleSelectedPost}
                  />
                </div>
              )
            })
        )}
      {hasNextPage && (
        <div className='my-4 w-full z-[1] loader' ref={observerElem}>
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
    </div>
  )
}

export default Explore
