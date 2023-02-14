import React, { useMemo, useState } from 'react'
import Head from 'next/head'
import axios from 'axios'
import { useQuery } from 'react-query'
import { BiLoaderAlt } from 'react-icons/bi'

import { useAppSelector } from 'store/hooks'
import { IPost } from 'types/interfaces'
import { ENV } from 'lib/env'

import ShowImagesModal from './ShowImagesModal'
import SinglePost from 'components/SinglePost/SinglePost'

function Trending() {
  const selectedAccount = useAppSelector(
    state => state.auth.selectedAccount
  )
  const [showImagesVisible, setShowImagesVisible] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [initialImageIndex, setInitialImageIndex] =
    useState<number>(0)

  const handleSelectedImages = (images: string[], index?: number) => {
    setSelectedImages(images)
    setInitialImageIndex(index ? index : 0)
    toggleShowImagesVisible()
  }

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
      className={`relative w-full max-w-[40rem] px-2 md:px-0 mb-8 ${
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
                  canPushToPost={true}
                  totalComments={
                    post.totalComments ? post.totalComments : 0
                  }
                />
              </div>
            ))}
          <ShowImagesModal
            showImagesVisible={showImagesVisible}
            toggleShowImagesVisible={toggleShowImagesVisible}
            images={selectedImages}
            initialIndex={initialImageIndex}
          />
        </React.Fragment>
      )}
    </div>
  )
}

export default Trending
