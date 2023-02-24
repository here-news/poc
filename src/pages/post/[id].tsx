import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { GetServerSideProps } from 'next'
import { useQuery, useQueryClient } from 'react-query'

import { ENV } from 'lib/env'
import { IPost } from 'types/interfaces'
import Layout from 'components/Layouts'

import EditPostModal from 'components/pages/home/EditPostModal/EditPostModal'
import ShowImagesModal from 'components/pages/home/ShowImagesModal'
import SinglePost from 'components/SinglePost/SinglePost'
import Replies from 'components/pages/Post/Replies'
import MinifiedPost from 'components/pages/home/MinifiedPost'

interface PostProps {
  postId: string
  postData: IPost | null
}

function Post({ postData, postId }: PostProps) {
  const queryClient = useQueryClient()

  const [selectedPost, setSelectedPost] = useState<IPost | null>(null)
  const [isReplyEdit, setIsReplyEdit] = useState(false)
  const [isEditPostModalVisible, setIsEditPostModalVisible] =
    useState(false)
  const [showImagesVisible, setShowImagesVisible] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [initialImageIndex, setInitialImageIndex] =
    useState<number>(0)

  const getPostAgain = useQuery(
    ['getSinglePost', postId],
    () => {
      return axios.get(`${ENV.API_URL}/getSinglePost/${postId}`)
    },
    {
      refetchOnWindowFocus: false,
      cacheTime: Infinity
    }
  )

  const post: IPost | null = useMemo(() => {
    return getPostAgain.data &&
      getPostAgain.data.data &&
      getPostAgain.data.data.data
      ? getPostAgain.data.data.data
      : postData
  }, [postData, getPostAgain.data])

  useEffect(() => {}, [])

  useEffect(() => {
    if (!isEditPostModalVisible) {
      setSelectedPost(null)
    }
  }, [isEditPostModalVisible])

  const handleSelectedPost = (post?: IPost, isReply?: boolean) => {
    toggleIsReplyEdit(isReply ? true : false)
    if (!post) return setSelectedPost(null)
    setSelectedPost(post)
  }

  const handleSelectedImages = (images: string[], index?: number) => {
    setSelectedImages(images)
    setInitialImageIndex(index ? index : 0)
    toggleShowImagesVisible()
  }

  const toggleIsReplyEdit = (state: boolean) => setIsReplyEdit(state)

  const toggleEditPostModal = () =>
    setIsEditPostModalVisible(prev => !prev)

  const toggleShowImagesVisible = () =>
    setShowImagesVisible(prev => !prev)

  const onReplySuccess = () => {
    queryClient.invalidateQueries('getSinglePost')
    queryClient.invalidateQueries('getReplies')
  }

  if (!post) return <React.Fragment />

  return (
    <Layout pageTitle='News Article - Here News' type='base'>
      <div className='relative w-full max-w-[40rem]'>
        {post.repliedTo && (
          <div className='pb-4 bg-white'>
            <MinifiedPost
              {...post.repliedTo}
              noBorder
              hasSingleLine
              noInteraction
              handleSelectedPost={handleSelectedPost}
              toggleEditPostModal={toggleEditPostModal}
            />
          </div>
        )}
        <SinglePost
          noBorder
          {...post}
          totalComments={post.replies ? post.replies.length : 0}
          handleSelectedImages={handleSelectedImages}
          toggleEditPostModal={toggleEditPostModal}
          handleSelectedPost={handleSelectedPost}
          showVoting
          showDetails
          hasCircle={!!post.repliedTo}
          hasLine={
            post.replies && post.replies.length === 1 ? true : false
          }
          canReply
          handleReplySuccessCallback={onReplySuccess}
          parentPostId={post.repliedTo && post.repliedTo._id}
        />
        <Replies
          postId={post._id}
          handleSelectedImages={handleSelectedImages}
          handleSelectedPost={handleSelectedPost}
          toggleEditPostModal={toggleEditPostModal}
        />
      </div>
      <EditPostModal
        isVisible={isEditPostModalVisible}
        toggleVisible={toggleEditPostModal}
        post={selectedPost}
        isSinglePost={true}
        isReplyEdit={isReplyEdit}
      />
      <ShowImagesModal
        images={selectedImages}
        initialIndex={initialImageIndex}
        showImagesVisible={showImagesVisible}
        toggleShowImagesVisible={toggleShowImagesVisible}
      />
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps<
  PostProps
> = async ({ req, params, resolvedUrl }) => {
  if (!params) {
    return {
      notFound: true
    }
  }

  const { id } = params

  try {
    const postData = await axios.get(
      `${ENV.API_URL}/getSinglePost/${id}`
    )

    //creating meta tags
    const data = postData.data.data
    const htmlToFormattedText = require('html-to-formatted-text')
    const description = htmlToFormattedText(postData.data.data.text)
    const imageUrl =
      data.images && data.images.length > 0 ? data.images[0] : ''
    const metaTags = data
      ? {
          'og:title': `${data.title} - Here News`,
          'og:description': `${description}`,
          'og:image': imageUrl,
          'og:url': `${req.headers.host}${resolvedUrl}`
        }
      : {}
    return {
      props: {
        postId: id && !Array.isArray(id) ? id : '',
        postData: postData.data.data,
        metaTags
      }
    }
  } catch (error) {
    return {
      notFound: true
    }
  }
}

export default Post
