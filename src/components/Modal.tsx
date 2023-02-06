import React, { ReactNode } from 'react'

interface ModalProps {
  isVisible: boolean
  toggleVisible: () => void
  children: ReactNode
}
function Modal({ isVisible, toggleVisible, children }: ModalProps) {
  return (
    <div
      className='bg-[rgba(0,0,0,0.3)] w-screen h-screen fixed top-0 left-0 z-[9999]'
      style={{
        display: isVisible ? 'inline-block' : 'none'
      }}
    >
      <div className='w-full h-full flex items-center justify-center'>
        <div className='relative max-w-[40rem] h-auto bg-white rounded-md'>
          <div
            className='absolute top-3 right-3 cursor-pointer'
            onClick={toggleVisible}
          >
            <h2>X</h2>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal
