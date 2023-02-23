import Layout from 'components/Layouts'
import Trending from 'components/pages/home/Trending'
import React from 'react'

function Home() {
  return (
    <Layout pageTitle="POC - Here News" type="base">
      <Trending />
    </Layout>
  )
}

export default Home
