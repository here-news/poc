import React from 'react'
import CompactLink from 'components/TextEditor/CompactLink'
import DetailedLink from 'components/TextEditor/DetailedLink'
import { ILinkDetails } from 'types/interfaces'
import LiteYouTubeEmbed from 'react-lite-youtube-embed'
import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css'

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
      {youtubeId && youtubeId !== '' ? (
        <div
          className='relative px-4'
          onClick={e => e.stopPropagation()}
        >
          <div className='w-full mt-4'>
            <LiteYouTubeEmbed
              id={youtubeId}
              iframeClass='h-60 w-full'
              title='youtube video player'
              poster='mqdefault'
            />
          </div>
        </div>
      ) : (
        url && (
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
        )
      )}
    </React.Fragment>
  )
}

export default LinkDetails
