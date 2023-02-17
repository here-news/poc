import Image from 'next/image'
import React from 'react'
import YouTube from 'react-youtube'
import {ILinkDetails} from 'types/interfaces'

function LinkDetails({
  url,
  description,
  favicons,
  images,
  siteName,
  title,
  youtubeId,
}: ILinkDetails) {
  return (
    <>
      {youtubeId && youtubeId !== '' && (
        <div className='relative px-4' onClick={e => e.stopPropagation()}>
          <a
            href={`${url}`}
            rel='noopener noreferrer'
            target='_blank'
            className='relative'
          >
            <YouTube
              videoId={youtubeId}
              className='w-full mt-4'
              iframeClassName='w-full'
              onReady={(event: any) => {
                event.target.pauseVideo()
              }}
            />
          </a>
        </div>
      )}
      {url && (
        <div className='relative px-4' onClick={e => e.stopPropagation()}>
          <a
            href={`${url}`}
            rel='noopener noreferrer'
            target='_blank'
            className='relative'
          >
            <div className='relative mt-4 flex flex-col border-[0.0625rem] border-slate-400 rounded-lg px-5 py-4 transition-colors duration-300 hover:bg-gray-200 cursor-pointer'>
              <div className='flex flex-row items-center'>
                <div className='relative mr-2 w-4 h-4'>
                  {favicons && favicons.length > 0 ? (
                    <Image src={favicons[0]} alt='link embed' fill />
                  ) : (
                    ''
                  )}
                </div>
                <p className='text-xs text-slate-700'>
                  {siteName
                    ? siteName
                    : new URL(url).hostname.split('.').slice(-2).join('.')}
                </p>
              </div>
              {images && images.length > 0 ? (
                <div className='relative w-full h-44 mt-1 mb-4'>
                  <Image
                    fill
                    src={images[0]}
                    alt='link_preview-image'
                    className='object-cover bg-gray-300'
                  />
                </div>
              ) : (
                ''
              )}
              {title ? (
                <h2 className='text-lg text-slate-800 font-bold'>{title}</h2>
              ) : (
                ''
              )}

              {description ? (
                <p className='mt-2 text-md text-slate-800'>{description}</p>
              ) : (
                ''
              )}

              <p
                className={`${
                  description ? 'mt-6' : 'mt-3'
                } text-blue-600 underline text-sm`}
              >
                Read the full article at
                {new URL(url).hostname.split('.').slice(-2).join('.')} »
              </p>
            </div>
          </a>
        </div>
      )}
    </>
  )
}

export default LinkDetails
