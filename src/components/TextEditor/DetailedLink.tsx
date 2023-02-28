import React from 'react'
import Image from 'next/image'
import { ILinkDetails } from 'types/interfaces'

interface DetailedLinkProps {
  details: ILinkDetails
  link: string
}

function DetailedLink({ link, details }: DetailedLinkProps) {
  return (
    <React.Fragment>
      <div className='flex flex-row items-center'>
        <div className='relative mr-2 w-3 h-3'>
          {details.favicons && details.favicons.length > 0 ? (
            <Image src={details.favicons[0]} alt='link embed' fill />
          ) : (
            ''
          )}
        </div>
        <p className='text-xs text-slate-700'>
          {details.siteName
            ? details.siteName
            : new URL(link || (details && details.url)).hostname
                .split('.')
                .slice(-2)
                .join('.')}
        </p>
      </div>
      {details.images && details.images.length > 0 ? (
        <div className='relative w-full h-32 mt-1 mb-2'>
          <Image
            fill
            src={details.images[0]}
            alt='link_preview-image'
            className='object-cover bg-gray-300'
          />
        </div>
      ) : (
        ''
      )}
      {details.title ? (
        <h2 className='text-md text-slate-800 font-bold'>
          {details.title}
        </h2>
      ) : (
        ''
      )}

      {details.description ? (
        <p className='mt-[0.125rem] text-xs text-slate-800'>
          {details.description}
        </p>
      ) : (
        ''
      )}

      <p
        className={`${
          details.description ? 'mt-2' : 'mt-1'
        } text-blue-600 underline text-xs`}
      >
        Read the full article at{' '}
        {new URL(link || (details && details.url)).hostname
          .split('.')
          .slice(-2)
          .join('.')}{' '}
        »
      </p>
    </React.Fragment>
  )
}

export default DetailedLink
