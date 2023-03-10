import axios from 'axios'
import { ENV } from 'lib/env'
import { useState } from 'react'
import { useQuery } from 'react-query'
import { ILinkDetails } from 'types/interfaces'

function useLinkPreview() {
  const [linkToPreview, setLinkToPreview] = useState<string | null>(
    null
  )
  const [isLinkPreviewRemoved, setIsLinkPreviewRemoved] =
    useState<boolean>(false)

  const { data, error, isLoading } = useQuery({
    queryKey: [`preview-${linkToPreview}`], // cache key
    queryFn: async () => {
      const link = linkToPreview as string // it will always be str here

      const response = await axios.get(
        `${ENV.API_URL}/getLinkDetails/${encodeURIComponent(link)}`
      )

      const preview = response.data.data as ILinkDetails

      return preview
    },
    staleTime: Infinity, // dont delete the cache as preview will mostly be the same
    enabled: linkToPreview !== null
  })

  return {
    linkPreviewError: error,
    linkPreview: isLinkPreviewRemoved ? null : data,
    isLoadingPreview: isLoading,
    getLinkPreview: (link: string) => {
      setIsLinkPreviewRemoved(false)
      setLinkToPreview(link)
    },
    removeLinkPreview: () => setIsLinkPreviewRemoved(true)
  }
}

export default useLinkPreview
