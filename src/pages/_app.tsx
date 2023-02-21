import React, { useEffect } from 'react'
import type { AppProps } from 'next/app'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ReactQueryDevtools } from 'react-query/devtools'
import { Provider } from 'react-redux'
import { store, persistor } from 'store'
import { PersistGate } from 'redux-persist/integration/react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import Header from 'components/Header'
import 'styles/globals.css'
import Head from 'next/head'
import io from 'lib/ioConfig'

const queryClient = new QueryClient()

export default function App({ Component, pageProps }: AppProps) {
  const { metaTags } = pageProps

  useEffect(() => {
    io.connect()
    return () => {
      io.disconnectSocket()
    }
  }, [])

  return (
    <React.Fragment>
      <Head>
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1'
        />
        <meta name='twitter:card' content='summary_large_image' />

        {metaTags &&
          Object.entries(metaTags).map(entry => {
            if (!entry[1]) return null
            return (
              <meta
                key={entry[1] as React.Key}
                property={entry[0]}
                content={entry[1] as string}
              />
            )
          })}
        <meta property='og:image:width' content='1200' />
        <meta property='og:image:height' content='630' />
      </Head>

      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <QueryClientProvider client={queryClient}>
            <Header />
            <div className='mt-[3.5rem]'>
              <Component {...pageProps} />
            </div>
            <ToastContainer />
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </PersistGate>
      </Provider>
    </React.Fragment>
  )
}
