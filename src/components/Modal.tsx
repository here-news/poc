import React, { ReactNode } from 'react'

interface ModalProps {
  isVisible: boolean
  toggleVisible: () => void
  children: ReactNode
}
function Modal({ isVisible, toggleVisible, children }: ModalProps) {
  return (
    <div
      className='fixed top-0 left-0 w-screen h-screen items-center justify-center z-20'
      style={{
        display: isVisible ? 'flex' : 'none'
      }}
    >
      <div
        className='bg-[rgba(0,0,0,0.4)] w-screen h-screen z-20 fixed top-0 left-0'
        onClick={toggleVisible}
      />
      <div className='rounded-lg z-30'>
        <div className='relative rounded-md'>
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
