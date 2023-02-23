import CreatePost from 'components/CreatePost/CreatePost'
import Layout from 'components/Layouts'
import { useRouter } from 'next/router'
import React from 'react'

function CreatePostPage() {
  const router = useRouter()

  return (
    <Layout pageTitle="Post Create" type="base">
      <div className="relative w-full max-w-[40rem]">
        <CreatePost onSuccessCallback={() => router.push('/')} />
      </div>
    </Layout>
  )
}

export default CreatePostPage
