import React, { useCallback, useEffect, useState } from 'react'
import Modal from 'components/Modal'
import Image from 'next/image'
import { getTypeMedia } from 'utils'

interface ShowImagesModalProps {
  showImagesVisible: boolean
  toggleShowImagesVisible: () => void
  images: string[]
  initialIndex: number
}

function ShowImagesModal({
  showImagesVisible,
  toggleShowImagesVisible,
  images,
  initialIndex
}: ShowImagesModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (showImagesVisible) setSelectedIndex(initialIndex)
  }, [showImagesVisible, initialIndex])

  const goBack = useCallback(() => {
    if (selectedIndex <= 0) return
    setSelectedIndex(selectedIndex - 1)
  }, [selectedIndex])

  const goForward = useCallback(() => {
    if (selectedIndex >= images.length - 1) return
    setSelectedIndex(selectedIndex + 1)
  }, [selectedIndex, images])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code === 'Escape') {
        toggleShowImagesVisible()
      } else if (event.code === 'ArrowLeft') {
        goBack()
      } else if (event.code === 'ArrowRight') {
        goForward()
      }
    }

    if (showImagesVisible)
      window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [showImagesVisible, goBack, goForward, toggleShowImagesVisible])

  return (
    <Modal
      isVisible={showImagesVisible}
      toggleVisible={toggleShowImagesVisible}
      hasCloseButton
      whiteCloseButton
    >
      <div className='w-screen h-screen  rounded-lg flex flex-row'>
        <div className='w-12 bg-[rgba(0,0,0,0.4)] flex items-center justify-center'>
          <div
            className={`${
              selectedIndex === 0 ? 'hidden' : 'flex'
            } cursor-pointer rounded-full bg-black flex-row items-center justify-center w-8 h-8`}
            onClick={goBack}
          >
            <p className='text-lg text-white'>&lt;</p>
          </div>
        </div>
        <div className='relative w-[calc(100%-96px)] my-2 flex justify-center items-center'>
          <div className='absolute bottom-0 w-full z-[1]'>
            <div className='flex items-center justify-center p-4 z-[1]'>
              <p className='text-white bg-[rgba(0,0,0,0.7)] px-4 py-2 rounded-lg font-semibold'>
                {selectedIndex + 1} / {images.length}
              </p>
            </div>
          </div>
          {images && getTypeMedia(images[selectedIndex]) === 'image' ? (
            <Image
              src={images[selectedIndex]}
              fill
              className='object-contain'
              alt='show image'
            />
          ) : getTypeMedia(images[selectedIndex]) === 'video' 
          ?  <video style={{width : 'fit-content', height:'fit-content'}} controls>
              <source src={images[selectedIndex]} />
            </video> 
          :(
            <React.Fragment />
          )}
        </div>
        <div className='w-12 bg-[rgba(0,0,0,0.4)] flex items-center justify-center'>
          <div
            className={`${
              selectedIndex === images.length - 1 ? 'hidden' : 'flex'
            } cursor-pointer rounded-full bg-black flex-row items-center justify-center w-8 h-8`}
            onClick={goForward}
          >
            <p className='text-lg text-white'>&gt;</p>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default ShowImagesModal
