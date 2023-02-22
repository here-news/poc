import CreatePost from 'components/CreatePost/CreatePost'
import { useRouter } from 'next/router'
import React from 'react'

function CreatePostPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[40rem]">
        <CreatePost onSuccessCallback={() => router.push('/')} />
      </div>
    </div>
  )
}

export default CreatePostPage
