import React from 'react'
import { useRouter } from 'next/router'
import { BiComment } from 'react-icons/bi'

interface ButtonsProps {
  postId: string
  totalComments: number
}

function Buttons({ postId, totalComments }: ButtonsProps) {
  const router = useRouter()

  const goToConversationSetion = () => {
    router.push(`/post/${postId}#conversation`)
  }
  return (
    <div className='flex flex-row items-center justify-between px-4'>
      <div
        className='flex-1 pt-6 pb-4 flex flex-row items-center text-slate-700 cursor-pointer'
        onClick={e => {
          e.stopPropagation()
          goToConversationSetion()
        }}
      >
        <span className='text-xl'>
          <BiComment />
        </span>
        <p className='ml-2 text-md'>{totalComments}</p>
      </div>
    </div>
  )
}

export default Buttons
