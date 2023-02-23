import Ticker from 'components/Ticker'
import Head from 'next/head'
import React from 'react'
import { ILayout } from './common/types'

const changeActivePage = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function BaseLayout({ children, pageTitle }: ILayout) {
  return (
    <div>
      <Head>
        <title>{pageTitle}</title>
        {/* 
          If needed - add meta tags here for this layout.
          To add meta tags globally, use _app.tsx  
        */}
      </Head>
      <Ticker onActivePageChange={changeActivePage} />
      <div className="flex flex-col items-center">{children}</div>
    </div>
  )
}

export default BaseLayout
