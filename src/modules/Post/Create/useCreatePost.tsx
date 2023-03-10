import axios from 'axios'
import useFiles from 'hooks/useFiles'
import useLinkPreview from 'hooks/useLinkPreview'
import { ENV } from 'lib/env'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from 'react-query'
import { useAppSelector } from 'store/hooks'

function useCreatePost() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [allFiles, setAllFiles] = useState<
    {
      file: File
      url?: string
    }[]
  >()

  const { accounts, selectedAccount } = useAppSelector(
    state => state.auth
  )

  // create post
  const { mutate, error, isLoading, data } = useMutation({
    mutationFn: async ({
      title,
      content,
      youtubeId
    }: {
      title: string
      content: string
      media: FileList | null
      youtubeId?: string
    }) => {
      if (isUploadingFileList) return // return if files are being uploaded

      if (!selectedAccount?._id) throw new Error('Please log in') // return if no user

      // api payload
      const payload: any = {
        userId: selectedAccount._id,
        title,
        // sanitize content
        text: await (async () => {
          const sanitize = await import('sanitize-html')
          return await sanitize.default(content)
        })(),
        images: (allFiles || []).map(x => x.url),
        // add link data
        ...(linkPreview && {
          preview: 'true',
          ...(linkPreview.description && {
            preview_description: linkPreview.description
          }),
          ...(linkPreview.favicons &&
            linkPreview.favicons.length > 0 && {
              preview_favicons: linkPreview.favicons.join(',')
            }),
          ...(linkPreview.images &&
            linkPreview.images.length > 0 && {
              preview_images: linkPreview.images.join(',')
            }),
          ...(linkPreview.youtubeId && {
            preview_youtubeId: linkPreview.youtubeId
          }),
          ...(linkPreview.siteName && {
            preview_siteName: linkPreview.siteName
          }),
          ...(linkPreview.title && {
            preview_title: linkPreview.title
          }),
          ...(linkPreview.url && {
            preview_url: linkPreview.url
          })
        }),
        // add youtube id
        ...(youtubeId && {
          preview: 'true',
          ...(youtubeId && {
            preview_youtubeId: youtubeId
          })
        })
      }

      // make api call
      const response = await axios.post(
        `${ENV.API_URL}/createPost`,
        payload
      )

      // remove cache
      queryClient.invalidateQueries('getExplorePosts')
      queryClient.invalidateQueries('getTrendingPosts')

      // redirect to post
      const postId = response?.data?.data?._id
      router.push(`/post/${postId}`)

      return payload
    }
  })

  // post link previews
  const {
    isLoadingPreview,
    getLinkPreview,
    linkPreview,
    linkPreviewError,
    removeLinkPreview
  } = useLinkPreview()

  // post file uploads
  const {
    uploadFileList,
    isUploadingFileList,
    removeFile,
    removeFiles
  } = useFiles()

  const uploadPickedFiles = async (files: FileList) => {
    const baseFiles = allFiles || []

    setAllFiles([
      ...(baseFiles || []),
      ...Array.from(files).map(x => ({ file: x }))
    ])

    const response = await uploadFileList(files)

    setAllFiles([...(baseFiles || []), ...response])
  }

  const removeAllPickedFiles = () => {
    const urls = (allFiles || [])
      .map(x => x?.url)
      .filter(Boolean) as string[]
    setAllFiles([])
    removeFiles(urls)
  }

  const removePickedFileAtIndex = (index: number) => {
    const files = [...(allFiles || [])]
    let foundFile = files[index]
    delete files[index]
    setAllFiles([...files.filter(Boolean)])

    if (foundFile.url) removeFile(foundFile.url)
  }

  useEffect(() => {
    if (!selectedAccount) router.push('/')
  }, [selectedAccount, router])

  return {
    accounts,
    selectedAccount,
    // for post creation
    createPost: mutate,
    postError: error,
    isCreatingPost: isLoading,
    newPost: data,
    // for link preview
    isLoadingPreview,
    getLinkPreview,
    removeLinkPreview,
    linkPreview,
    linkPreviewError,
    // for files management
    uploadPickedFiles,
    isUploadingFiles: isUploadingFileList,
    allFiles,
    removeAllPickedFiles,
    removePickedFileAtIndex
  }
}

export default useCreatePost
