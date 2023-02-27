import React from 'react'
import Modal from 'components/Modal'
import EditPost from 'components/EditPost/EditPost'
import { IPost } from 'types/interfaces'
import { useQueryClient } from 'react-query'

interface EditPostModalProps {
  isVisible: boolean
  toggleVisible: () => void
  post: IPost | null
  isSinglePost?: boolean
  isReplyEdit?: boolean
}

function EditPostModal({
  isVisible,
  toggleVisible,
  post,
  isSinglePost,
  isReplyEdit
}: EditPostModalProps) {
  const queryClient = useQueryClient()

  const handleCloseModal = () => {
    isVisible && toggleVisible()
  }

  const handleSuccessCallback = () => {
    if (isSinglePost) {
      queryClient.invalidateQueries('getSinglePost')
    }
    if (isReplyEdit) {
      queryClient.invalidateQueries('getReplies')
    }
    handleCloseModal()
  }
  if (!post) return <React.Fragment />
  return (
    <Modal
      isVisible={isVisible}
      toggleVisible={handleCloseModal}
      hasCloseButton
    >
      <div className='relative w-screen max-w-[40rem] max-h-[95vh] bg-white rounded-lg'>
        <h2 className='mb-4 text-lg font-bold pt-4 px-4'>
          {isReplyEdit || post.repliedTo ? 'Edit Reply' : 'Edit Post'}
        </h2>

        <div className='max-h-[84vh] overflow-scroll px-4'>
          <EditPost
            {...post}
            isReplyEdit={isReplyEdit || post.repliedTo ? true : false}
            isModalVisible={isVisible}
            onSuccessCallback={handleSuccessCallback}
          />
        </div>
      </div>
    </Modal>
  )
}

export default EditPostModal
