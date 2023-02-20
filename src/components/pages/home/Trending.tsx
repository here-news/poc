import React, { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import axios from 'axios'
import { useQuery } from 'react-query'
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

  const query = useQuery('getTrendingPosts', () => {
    return axios.get(`${ENV.API_URL}/getTrendingPosts`)
  })

  const postList: IPost[] = useMemo(() => {
    return query.data && query.data.data && query.data.data.data
  }, [query.data])

  return (
    <div
      className={`relative w-full px-2 md:px-0 mb-8 ${
        selectedAccount ? 'mt-2' : ''
      }`}
    >
      <Head>
        <title>Trending - Here News</title>
      </Head>
      {query.isLoading ? (
        <div className='absolute top-0 w-full z-[1]'>
          <div className='flex items-center justify-center z-[1]'>
            <p className='text-white text-sm bg-black px-3 py-2 rounded-lg font-semibold flex flex-row items-center'>
              <span className='animate-spin rotate mr-2'>
                <BiLoaderAlt color='white' />
              </span>
              Loading posts...
            </p>
          </div>
        </div>
      ) : (
        <React.Fragment>
          <div className='px-4'>
            <Masonry
              breakpointCols={breakpointColumnsObj}
              className='trending'
              columnClassName='trending_column'
            >
              {postList &&
                postList.map((post, i) => (
                  <div
                    key={post._id}
                    className={`w-full ${
                      i === 0 && !selectedAccount ? 'mt-0' : 'mt-4'
                    }`}
                  >
                    <SinglePost
                      _id={post._id}
                      userId={post.userId}
                      createdAt={post.createdAt}
                      title={post.title}
                      images={post.images}
                      text={post.text}
                      downvotes={post.downvotes}
                      upvotes={post.upvotes}
                      totalVotes={post.totalVotes}
                      handleSelectedImages={handleSelectedImages}
                      toggleEditPostModal={toggleEditPostModal}
                      handleSelectedPost={handleSelectedPost}
                      canPushToPost={true}
                      totalComments={
                        post.totalComments ? post.totalComments : 0
                      }
                      preview={post.preview}
                      showMore
                    />
                  </div>
                ))}
            </Masonry>
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
      )}
    </div>
  )
}

export default Trending
