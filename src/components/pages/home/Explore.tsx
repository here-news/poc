import axios from 'axios'
import { ENV } from 'lib/env'
import React, { useMemo } from 'react'
import { useQuery } from 'react-query'
import { IPost } from 'types/interfaces'
import Post from './Post'

function Explore() {
  const query = useQuery('getExplorePosts', () => {
    return axios.get(`${ENV.API_URL}/getExplorePosts`)
  })

  const postList: IPost[] = useMemo(() => {
    return query.data && query.data.data && query.data.data.data
  }, [query.data])

  return (
    <div className='w-full max-w-[40rem] px-4 mt-4'>
      {postList &&
        postList.map(({ _id, userId, createdAt, images, text }) => (
          <div key={_id} className='w-full mt-4'>
            <Post
              _id={_id}
              userId={userId}
              createdAt={createdAt}
              images={images}
              text={text}
            />
          </div>
        ))}
    </div>
  )
}

export default Explore
