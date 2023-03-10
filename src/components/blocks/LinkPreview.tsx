import Image from 'next/image'
import React from 'react'
import { MdClose } from 'react-icons/md'
import LiteYouTubeEmbed from 'react-lite-youtube-embed'
import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css'

interface ILinkPreview {
  url?: string
  favicons?: string[]
  siteName?: string
  images?: string[]
  title?: string
  description?: string
  youtubeId?: string
  type: 'compact' | 'detailed'
  isRemoveable?: boolean
  onRemove?: (props?: any) => any
}

function LinkPreview({
  url,
  favicons,
  siteName,
  images,
  title,
  description,
  youtubeId,
  type,
  isRemoveable,
  onRemove
}: ILinkPreview) {
  return (
    <React.Fragment key={url}>
      <div className='relative'>
        {isRemoveable && (
          <button
            type='button'
            className='absolute top-2 -right-1 bg-black shadow-md rounded-full p-1 z-[1] cursor-pointer'
            onClick={async e => {
              e.stopPropagation()
              onRemove && (await onRemove())
            }}
          >
            <MdClose className='text-white' />
          </button>
        )}

        {youtubeId && (
          <div className='w-full mt-4'>
            <LiteYouTubeEmbed
              id={youtubeId}
              iframeClass='h-60 w-full'
              title='youtube video player'
            />
          </div>
        )}

        {['detailed', 'compact'].includes(type) &&
          !youtubeId &&
          url && (
            <a
              href={url}
              rel='noopener noreferrer'
              target='_blank'
              className='relative'
            >
              <div className='relative mt-4 flex flex-col border-[0.0625rem] border-slate-400 rounded-lg px-3 py-3 transition-colors duration-300 hover:bg-gray-200 cursor-pointer'>
                <React.Fragment>
                  <div className='flex flex-row items-center'>
                    <div className='relative mr-2 w-3 h-3'>
                      {favicons && favicons.length > 0 && (
                        <Image
                          src={favicons[0]}
                          alt='link embed'
                          fill
                        />
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

                  {/* only show images in detailed view */}
                  {type === 'detailed' &&
                    images &&
                    images.length > 0 && (
                      <div className='relative w-full h-32 mt-1 mb-2'>
                        <Image
                          fill
                          src={images[0]}
                          alt='link_preview-image'
                          className='object-cover bg-gray-300'
                        />
                      </div>
                    )}

                  {title && (
                    <h2
                      className={`text-sm text-slate-800 font-bold ${
                        type === 'detailed' ? 'text-md' : 'text-sm'
                      }`}
                    >
                      {title}
                    </h2>
                  )}

                  {description && (
                    <p className='mt-[0.125rem] text-xs text-slate-800'>
                      {description}
                    </p>
                  )}

                  <p
                    className={`${
                      description ? 'mt-2' : 'mt-1'
                    } text-blue-600 underline text-xs`}
                  >
                    Read the full article at{' '}
                    {new URL(url).hostname
                      .split('.')
                      .slice(-2)
                      .join('.')}{' '}
                    »
                  </p>
                </React.Fragment>
              </div>
            </a>
          )}
      </div>
    </React.Fragment>
  )
}

export default LinkPreview
