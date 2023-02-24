import React from 'react'
import { IPost } from 'types/interfaces'
import SingleReply from './SingleReply'

interface RepliesProps {
  replies?: IPost[]
  handleSelectedImages: (images: string[], index?: number) => void
  handleSelectedPost: (post?: IPost, isReply?: boolean) => void
  toggleEditPostModal: () => void
}

function RepliesList({
  replies,
  handleSelectedImages,
  handleSelectedPost,
  toggleEditPostModal
}: RepliesProps) {
  return (
    <div>
      {replies &&
        replies.map(reply => {
          const childRepliesList =
            reply.replies && Array.isArray(reply.replies)
              ? reply.replies
              : []

          return (
            <div key={reply._id}>
              <SingleReply
                {...reply}
                canPushToPost
                totalComments={
                  reply.replies ? reply.replies.length : 0
                }
                isSeperate={
                  !(
                    replies.length === 1 ||
                    childRepliesList.length === 1
                  )
                }
                hasLine={childRepliesList.length === 1}
                noBorder
                handleSelectedImages={handleSelectedImages}
                handleSelectedPost={handleSelectedPost}
                toggleEditPostModal={toggleEditPostModal}
              />

              {childRepliesList.length > 0 && (
                <RepliesList
                  replies={childRepliesList}
                  handleSelectedImages={handleSelectedImages}
                  handleSelectedPost={handleSelectedPost}
                  toggleEditPostModal={toggleEditPostModal}
                />
              )}
            </div>
          )
        })}
    </div>
  )
}

export default RepliesList
