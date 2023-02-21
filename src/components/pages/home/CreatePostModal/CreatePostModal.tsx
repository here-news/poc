import React from 'react'
import Modal from 'components/Modal'
import CreatePost from 'components/CreatePost/CreatePost'

interface CreatePostModalProps {
  isVisible: boolean
  toggleVisible: (state: boolean) => void
}

function CreatePostModal({
  isVisible,
  toggleVisible
}: CreatePostModalProps) {
  const handleCloseModal = () => {
    isVisible && toggleVisible(false)
  }

  const handleSuccessCallback = () => {
    handleCloseModal()
  }
  return (
    <Modal
      isVisible={isVisible}
      toggleVisible={handleCloseModal}
      hasCloseButton
    >
      <div className='relative w-screen max-w-[40rem] max-h-[96vh] bg-white rounded-lg pb-4'>
        <h2 className='mb-4 text-lg font-bold pt-4 px-4'>
          Add a new news
        </h2>

        <div className='max-h-[86vh] overflow-scroll px-4'>
          <CreatePost onSuccessCallback={handleSuccessCallback} />
        </div>
      </div>
    </Modal>
  )
}

export default CreatePostModal
