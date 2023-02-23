import CompactLink from 'components/TextEditor/CompactLink'
import DetailedLink from 'components/TextEditor/DetailedLink'
import Image from 'next/image'
import React from 'react'
import { ILinkDetails } from 'types/interfaces'

interface LinkDetailsProps extends ILinkDetails {
  type: 'detailed' | 'compact'
}
function LinkDetails({
  url,
  description,
  favicons,
  images,
  siteName,
  title,
  youtubeId,
  type
}: LinkDetailsProps) {
  return (
    <React.Fragment>
      {youtubeId && youtubeId !== '' && (
        <div
          className='relative px-4'
          onClick={e => e.stopPropagation()}
        >
          <a
            href={`${url}`}
            rel='noopener noreferrer'
            target='_blank'
            className='relative'
          >
            <div className='w-full mt-4'>
              <iframe
                className='h-60 w-full'
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title='YouTube video player'
                allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                allowFullScreen
              />
            </div>
          </a>
        </div>
      )}
      {url && (
        <div
          className='relative px-4'
          onClick={e => e.stopPropagation()}
        >
          <a
            href={`${url}`}
            rel='noopener noreferrer'
            target='_blank'
            className='relative'
          >
            <div className='relative mt-4 flex flex-col border-[0.0625rem] border-slate-400 rounded-lg px-3 py-3 transition-colors duration-300 hover:bg-gray-200 cursor-pointer'>
              {type === 'detailed' ? (
                <DetailedLink
                  details={{
                    url,
                    description,
                    favicons,
                    images,
                    siteName,
                    title,
                    youtubeId
                  }}
                  link={url}
                />
              ) : (
                <CompactLink
                  details={{
                    url,
                    description,
                    favicons,
                    images,
                    siteName,
                    title,
                    youtubeId
                  }}
                  link={url}
                />
              )}
            </div>
          </a>
        </div>
      )}
    </React.Fragment>
  )
}

export default LinkDetails
