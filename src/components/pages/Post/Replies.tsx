import axios from 'axios'
import { ENV } from 'lib/env'
import React, { useMemo } from 'react'
import { useQuery } from 'react-query'
import { IPost } from 'types/interfaces'
import RepliesList from './RepliesList'

interface RepliesProps {
  postId?: string
  replies?: IPost[]
  handleSelectedImages: (images: string[], index?: number) => void
  handleSelectedPost: (post?: IPost, isReply?: boolean) => void
  toggleEditPostModal: () => void
}
function Replies({
  postId,
  handleSelectedImages,
  handleSelectedPost,
  toggleEditPostModal
}: RepliesProps) {
  const getRepliesQuery = useQuery(
    ['getReplies', postId],
    () => {
      return axios.get(`${ENV.API_URL}/getPostReplies/${postId}`)
    },
    {
      refetchOnWindowFocus: false
    }
  )

  const repliesList: IPost[] = useMemo(() => {
    return (
      getRepliesQuery.data &&
      getRepliesQuery.data.data &&
      getRepliesQuery.data.data.data &&
      getRepliesQuery.data.data.data.replies
    )
  }, [getRepliesQuery.data])

  return (
    <RepliesList
      replies={repliesList}
      handleSelectedImages={handleSelectedImages}
      handleSelectedPost={handleSelectedPost}
      toggleEditPostModal={toggleEditPostModal}
    />
  )
}

export default Replies
