import React, { useState } from 'react'
import Head from 'next/head'

import Ticker from 'components/pages/home/Ticker'
import CreatePost from 'components/pages/home/CreatePost/CreatePost'
import Trending from 'components/pages/home/Trending'
import Explore from 'components/pages/home/Explore'

function Home() {
  const [activePage, setActivePage] = useState('trending')

  const changeActivePage = (page: string) => {
    setActivePage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      <Head>
        <title>POC - Here News</title>
      </Head>
      <Ticker changeActivePage={changeActivePage} />{' '}
      <div className='flex flex-col items-center'>
        <div className='w-full max-w-[40rem] mt-2 px-2 md:px-0'>
          <CreatePost />
        </div>
      </div>
      {activePage === 'trending' ? (
        <div className='flex flex-col items-center'>
          <Trending />
        </div>
      ) : (
        <div className='flex flex-col items-center'>
          <Explore />
        </div>
      )}
    </div>
  )
}

export default Home
