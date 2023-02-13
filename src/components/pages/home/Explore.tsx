import React, { useMemo } from 'react'
import axios from 'axios'
import Head from 'next/head'
import { useQuery } from 'react-query'

import { useAppSelector } from 'store/hooks'
import { ENV } from 'lib/env'
import { IPost } from 'types/interfaces'

import MinifiedPost from './MinifiedPost'

function Explore() {
  const selectedAccount = useAppSelector(
    state => state.auth.selectedAccount
  )
  const query = useQuery('getExplorePosts', () => {
    return axios.get(`${ENV.API_URL}/getExplorePosts`)
  })

  const postList: IPost[] = useMemo(() => {
    return query.data && query.data.data && query.data.data.data
  }, [query.data])

  return (
    <div
      className={`w-full max-w-[40rem] px-2 md:px-0 ${
        selectedAccount ? 'mt-2' : ''
      }`}
    >
      <Head>
        <title>Explore - Here News</title>
      </Head>
      {postList &&
        postList.map((post, i) => (
          <div
            key={post._id}
            className={`w-full ${
              i === 0 && !selectedAccount ? 'mt-0' : 'mt-4'
            }`}
          >
            <MinifiedPost
              index={i + 1}
              _id={post._id}
              userId={post.userId}
              createdAt={post.createdAt}
              title={post.title}
              totalVotes={post.totalVotes}
              upvotes={post.upvotes}
              downvotes={post.downvotes}
              totalComments={post.totalComments}
            />
          </div>
        ))}
    </div>
  )
}

export default Explore
