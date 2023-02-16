import React from 'react'
import Modal from 'components/Modal'
import EditPost from 'components/EditPost/EditPost'
import { IPost } from 'types/interfaces'

interface EditPostModalProps {
  isVisible: boolean
  toggleVisible: () => void
  post: IPost | null
  isSinglePost?: boolean
}

function EditPostModal({
  isVisible,
  toggleVisible,
  post,
  isSinglePost
}: EditPostModalProps) {
  const handleCloseModal = () => {
    isVisible && toggleVisible()
  }

  const handleSuccessCallback = () => {
    if (isSinglePost) {
      window.location.reload()
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
          Edit Post
        </h2>

        <div className='max-h-[84vh] overflow-scroll px-4'>
          <EditPost
            {...post}
            isModalVisible={isVisible}
            onSuccessCallback={handleSuccessCallback}
          />
        </div>
      </div>
    </Modal>
  )
}

export default EditPostModal
