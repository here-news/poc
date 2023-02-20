import Image from 'next/image'
import React from 'react'
import { ILinkDetails } from 'types/interfaces'

function LinkDetails({
  url,
  description,
  favicons,
  images,
  siteName,
  title,
  youtubeId
}: ILinkDetails) {
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
              <div className='flex flex-row items-center'>
                <div className='relative mr-2 w-3 h-3'>
                  {favicons && favicons.length > 0 ? (
                    <Image src={favicons[0]} alt='link embed' fill />
                  ) : (
                    ''
                  )}
                </div>
                <p className='text-xs text-slate-700'>
                  {siteName
                    ? siteName
                    : new URL(url).hostname
                        .split('.')
                        .slice(-2)
                        .join('.')}
                </p>
              </div>
              {images && images.length > 0 ? (
                <div className='relative w-full h-32 mt-1 mb-2'>
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
                <h2 className='text-md text-slate-800 font-bold'>
                  {title}
                </h2>
              ) : (
                ''
              )}

              {description ? (
                <p className='mt-[0.125rem] text-xs text-slate-800'>
                  {description}
                </p>
              ) : (
                ''
              )}

              <p
                className={`${
                  description ? 'mt-2' : 'mt-1'
                } text-blue-600 underline text-xs`}
              >
                Read the full article at
                {new URL(url).hostname
                  .split('.')
                  .slice(-2)
                  .join('.')}{' '}
                »
              </p>
            </div>
          </a>
        </div>
      )}
    </React.Fragment>
  )
}

export default LinkDetails
