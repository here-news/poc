import React, {useEffect, useState} from 'react'
import {useRouter} from 'next/router'
import axios from 'axios'
import {ENV} from 'lib/env'
import {GetServerSideProps} from 'next'
import {IPost} from 'types/interfaces'
import Head from 'next/head'

import SinglePost from 'components/SinglePost/SinglePost'
import ShowImagesModal from 'components/pages/home/ShowImagesModal'
import Comments from 'components/pages/Post/Comments'
import EditPostModal from 'components/pages/home/EditPostModal/EditPostModal'

interface PostProps {
  postData: IPost | null
}

function Post({postData}: PostProps) {
  const [selectedPost, setSelectedPost] = useState<IPost | null>(null)
  const [isEditPostModalVisible, setIsEditPostModalVisible] = useState(false)
  const [showImagesVisible, setShowImagesVisible] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [initialImageIndex, setInitialImageIndex] = useState<number>(0)

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

  const toggleEditPostModal = () => setIsEditPostModalVisible(prev => !prev)

  const toggleShowImagesVisible = () => setShowImagesVisible(prev => !prev)

  if (!postData) return <React.Fragment />
  return (
    <div className='flex flex-col items-center'>
      <Head>
        <title>News Article - Here News</title>
      </Head>
      <div className='relative w-full max-w-[40rem]'>
        <SinglePost
          noBorder
          _id={postData._id}
          createdAt={postData.createdAt}
          downvotes={postData.downvotes}
          handleSelectedImages={handleSelectedImages}
          title={postData.title}
          totalVotes={postData.totalVotes}
          upvotes={postData.upvotes}
          userId={postData.userId}
          images={postData.images}
          text={postData.text}
          totalComments={postData.totalComments ? postData.totalComments : 0}
          preview={postData.preview}
          toggleEditPostModal={toggleEditPostModal}
          handleSelectedPost={handleSelectedPost}
        />
        <Comments
          postId={postData._id}
          totalComments={postData.totalComments}
        />
      </div>
      <EditPostModal
        isVisible={isEditPostModalVisible}
        toggleVisible={toggleEditPostModal}
        post={selectedPost}
        isSinglePost={true}
      />
      <ShowImagesModal
        images={selectedImages}
        initialIndex={initialImageIndex}
        showImagesVisible={showImagesVisible}
        toggleShowImagesVisible={toggleShowImagesVisible}
      />
    </div>
  )
}

export const getServerSideProps: GetServerSideProps<PostProps> = async ({
  params,
}) => {
  if (!params) {
    return {
      notFound: true,
    }
  }

  const {id} = params

  try {
    const postData = await axios.get(`${ENV.API_URL}/getSinglePost/${id}`)
    return {
      props: {
        postData: postData.data.data,
      },
    }
  } catch (error) {
    return {
      notFound: true,
    }
  }
}

export default Post
