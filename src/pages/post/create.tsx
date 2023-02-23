import CreatePost from 'components/CreatePost/CreatePost'
import Layout from 'components/Layouts'
import React from 'react'

function CreatePostPage() {
  return (
    <Layout pageTitle="Post Create" type="base">
      <div className="relative w-full max-w-[40rem]">
        <CreatePost />
      </div>
    </Layout>
  )
}

export default CreatePostPage
