import Image from 'next/image'
import React, {useCallback, useEffect, useState} from 'react'
import {BiLoaderAlt} from 'react-icons/bi'
import {MdClose} from 'react-icons/md'
import {ILinkDetails} from 'types/interfaces'
import getLinkDetails from './getLinkDetails'

interface LinkDetailsProps {
  prevPreview?:
    | {
        url: string
        favicons?: string[] | undefined
        siteName?: string | undefined
        images?: string[] | undefined
        title?: string | undefined
        description?: string | undefined
        youtubeId?: string | undefined
      }
    | undefined
  isVisible: boolean
  previewData: ILinkDetails | null
  toggleVisible: (previewState: boolean) => void
  link: string
  resetLinkPreview: () => void
  handlePreviewData: (data?: ILinkDetails | undefined) => void
  toggleDisablePost: (state: boolean) => void
}

function LinkDetails({
  link,
  isVisible,
  toggleVisible,
  resetLinkPreview,
  handlePreviewData,
  toggleDisablePost,
  previewData,
  prevPreview,
}: LinkDetailsProps) {
  const [details, setDetails] = useState<ILinkDetails | null>(null)
  const [prevLink, setPrevLink] = useState('')
  const [initialSetPrev, setInitialSetPrev] = useState(false)

  const removeLink = useCallback(() => {
    resetLinkPreview()
    toggleVisible(false)
    setDetails(null)
    setPrevLink('')
    previewData?.youtubeId
      ? handlePreviewData({youtubeId: previewData?.youtubeId} as ILinkDetails)
      : handlePreviewData()
  }, [handlePreviewData, resetLinkPreview, toggleVisible])

  useEffect(() => {
    async function getAllLinkDetails() {
      setPrevLink(link)
      const linkDetails = await getLinkDetails(link)
      toggleDisablePost(false)

      if (!linkDetails) {
        removeLink()
        return
      }
      setDetails(linkDetails)
      handlePreviewData({...previewData, ...linkDetails})
    }

    if (prevPreview && !initialSetPrev) {
      setDetails(prevPreview)
      handlePreviewData(prevPreview)
      setInitialSetPrev(true)
    } else if (isVisible && link && !prevLink) {
      toggleDisablePost(true)
      getAllLinkDetails()
    }
  }, [
    initialSetPrev,
    prevPreview,
    handlePreviewData,
    isVisible,
    link,
    prevLink,
    removeLink,
    toggleDisablePost,
  ])

  if (!isVisible) return <React.Fragment />
  return (
    <div className='relative'>
      <div
        className='absolute -top-2 -right-1 bg-black shadow-md rounded-full p-1 z-[1] cursor-pointer'
        onClick={e => {
          e.stopPropagation()
          removeLink()
        }}
      >
        <MdClose className='text-white' />
      </div>
      <a
        href={`${link || (details && details.url)}`}
        rel='noopener noreferrer'
        target='_blank'
        className='relative'
      >
        <div className='relative mt-4 flex flex-col border-[0.0625rem] border-slate-400 rounded-lg px-5 py-4 transition-colors duration-300 hover:bg-gray-200 cursor-pointer'>
          {!details ? (
            <div className='flex items-center justify-center'>
              <span className='animate-spin rotate mr-2'>
                <BiLoaderAlt />
              </span>
            </div>
          ) : (
            <React.Fragment>
              <div className='flex flex-row items-center'>
                <div className='relative mr-2 w-4 h-4'>
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
                <div className='relative w-full h-44 mt-1 mb-4'>
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
                <h2 className='text-lg text-slate-800 font-bold'>
                  {details.title}
                </h2>
              ) : (
                ''
              )}

              {details.description ? (
                <p className='mt-2 text-md text-slate-800'>
                  {details.description}
                </p>
              ) : (
                ''
              )}

              <p
                className={`${
                  details.description ? 'mt-6' : 'mt-3'
                } text-blue-600 underline text-sm`}
              >
                Read the full article at
                {new URL(link || (details && details.url)).hostname
                  .split('.')
                  .slice(-2)
                  .join('.')}{' '}
                »
              </p>
            </React.Fragment>
          )}
        </div>
      </a>
    </div>
  )
}

export default LinkDetails
