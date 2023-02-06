import React from 'react'
import Header from '../components/Header'
import CreatePost from '../components/pages/home/CreatePost'
import Post from '../components/pages/home/Post'

function Home() {
  return (
    <div>
      <Header />
      <div className='mt-[56px] pt-4 flex flex-col items-center'>
        <CreatePost />
        {/* <Post /> */}
      </div>
    </div>
  )
}

export default Home
