import React, { useState } from 'react'
import Head from 'next/head'

import Ticker from 'components/pages/home/Ticker'
import Trending from 'components/pages/home/Trending'

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
        <Trending />
      </div>
    </div>
  )
}

export default Home
