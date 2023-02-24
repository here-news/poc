import Image from 'next/image'
import React, { useCallback, useEffect, useState } from 'react'
import { BiLoaderAlt } from 'react-icons/bi'
import { MdClose } from 'react-icons/md'
import { ILinkDetails } from 'types/interfaces'
import CompactLink from './CompactLink'
import DetailedLink from './DetailedLink'
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
  type: 'compact' | 'detailed'
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
  type
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
      ? handlePreviewData({
          youtubeId: previewData?.youtubeId
        } as ILinkDetails)
      : handlePreviewData()
  }, [
    handlePreviewData,
    resetLinkPreview,
    toggleVisible,
    previewData?.youtubeId
  ])

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
      handlePreviewData({ ...linkDetails })
    }

    if (prevPreview && !initialSetPrev) {
      setDetails(prevPreview)
      handlePreviewData(prevPreview)
      setInitialSetPrev(true)
    } else if (
      isVisible &&
      link &&
      (!prevLink || prevLink !== link)
    ) {
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
    previewData
  ])

  if (!isVisible) return <React.Fragment />
  return (
    <React.Fragment key={link}>
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
          <div className='relative mt-4 flex flex-col border-[0.0625rem] border-slate-400 rounded-lg px-3 py-3 transition-colors duration-300 hover:bg-gray-200 cursor-pointer'>
            {!details ? (
              <div className='flex items-center justify-center'>
                <span className='animate-spin rotate mr-2'>
                  <BiLoaderAlt />
                </span>
              </div>
            ) : (
              <React.Fragment>
                {type === 'detailed' ? (
                  <DetailedLink details={details} link={link} />
                ) : (
                  <CompactLink details={details} link={link} />
                )}
              </React.Fragment>
            )}
          </div>
        </a>
      </div>
    </React.Fragment>
  )
}

export default LinkDetails
