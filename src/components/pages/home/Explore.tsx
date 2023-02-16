import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import Head from 'next/head'
import { useQuery } from 'react-query'

import { useAppSelector } from 'store/hooks'
import { ENV } from 'lib/env'
import { IPost } from 'types/interfaces'

import MinifiedPost from './MinifiedPost'
import EditPostModal from './EditPostModal/EditPostModal'

function Explore() {
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

  const query = useQuery('getExplorePosts', () => {
    return axios.get(`${ENV.API_URL}/getExplorePosts`)
  })

  const postList: IPost[] = useMemo(() => {
    return query.data && query.data.data && query.data.data.data
  }, [query.data])

  return (
    <div
      className={`w-full max-w-[40rem] px-2 md:px-0 ${
        selectedAccount ? 'mt-2' : ''
      }`}
    >
      <Head>
        <title>Explore - Here News</title>
      </Head>
      {postList &&
        postList.map((post, i) => (
          <div
            key={post._id}
            className={`w-full ${
              i === 0 && !selectedAccount ? 'mt-0' : 'mt-4'
            }`}
          >
            <MinifiedPost
              index={i + 1}
              _id={post._id}
              userId={post.userId}
              createdAt={post.createdAt}
              title={post.title}
              totalVotes={post.totalVotes}
              upvotes={post.upvotes}
              downvotes={post.downvotes}
              totalComments={post.totalComments}
              images={post.images}
              preview={post.preview}
              text={post.text}
              toggleEditPostModal={toggleEditPostModal}
              handleSelectedPost={handleSelectedPost}
            />
          </div>
        ))}
      <EditPostModal
        isVisible={isEditPostModalVisible}
        toggleVisible={toggleEditPostModal}
        post={selectedPost}
      />
    </div>
  )
}

export default Explore
