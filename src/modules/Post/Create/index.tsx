import LinkPreview from 'components/blocks/LinkPreview'
import Form from 'components/core/Form'
import Input from 'components/core/Input'
import Media from 'components/core/Media'
import MediaPicker from 'components/core/MediaPicker'
import RichTextEditor from 'components/core/RichTextEditor'
import React, { useState } from 'react'
import { IoMdImages } from 'react-icons/io'
import useCreatePost from './useCreatePost'
import { createPostValidation } from './validation'
import { youtubeParser } from 'utils'

function CreatePost() {
  const {
    accounts,
    selectedAccount,
    // for post
    createPost,
    isCreatingPost,
    newPost,
    // for link preview
    getLinkPreview,
    linkPreview,
    removeLinkPreview,
    // for files management
    allFiles,
    isUploadingFiles,
    uploadPickedFiles,
    removeAllPickedFiles,
    removePickedFileAtIndex
  } = useCreatePost()

  const [youtubeId, setYoutubeId] = useState<string | undefined>()
  const handleLinkAdded = async (link: string) => {
    const youtubeIdFromLink = youtubeParser(link)
    if (youtubeIdFromLink) {
      setYoutubeId(youtubeIdFromLink)
      return
    }
    await getLinkPreview(link)
  }

  if (!accounts || !selectedAccount) return <React.Fragment />

  return (
    <Form
      onSubmit={async values =>
        createPost({ ...values, youtubeId: youtubeId })
      }
      validationSchema={createPostValidation}
      className='w-full max-w-[40rem] bg-white p-4 flex flex-col gap-2'
    >
      <MediaPicker
        hookToForm
        name='media'
        allowedMediaTypes={['image/*', 'video/*']}
        onUniqueFilesPicked={uploadPickedFiles}
      >
        {({ error, openPicker }) => (
          <>
            <div className='flex flex-row items-center justify-between'>
              <div className='flex flex-col gap-2'>
                <div className='flex flex-row gap-2 items-end'>
                  <div className='flex items-center justify-center z-[1] cursor-pointer'>
                    <button
                      type='button'
                      className={`text-white text-sm ${
                        isCreatingPost || isUploadingFiles
                          ? 'bg-gray-700 cursor-not-allowed'
                          : 'bg-black'
                      } px-3 py-2 rounded-lg flex flex-row items-center`}
                      onClick={
                        !isUploadingFiles ? openPicker : () => {}
                      }
                    >
                      <span className='mr-2 text-lg'>
                        <IoMdImages color='white' />
                      </span>
                      Images
                    </button>
                  </div>
                  {allFiles &&
                    allFiles.length > 0 &&
                    !isCreatingPost &&
                    !isUploadingFiles && (
                      <React.Fragment>
                        <p className='text-md text-slate-400'>
                          {allFiles.length} Selected
                        </p>
                        <button
                          type='button'
                          className={`${
                            isCreatingPost
                              ? 'cursor-not-allowed'
                              : 'cursor-pointer'
                          } text-md text-blue-500 underline`}
                          onClick={removeAllPickedFiles}
                        >
                          Clear
                        </button>
                      </React.Fragment>
                    )}
                </div>
              </div>

              <button
                disabled={isCreatingPost || isUploadingFiles}
                type={
                  isCreatingPost || isUploadingFiles
                    ? 'button'
                    : 'submit'
                }
                className={`cursor-pointer transition duration-500 ease-in-out ${
                  isCreatingPost
                    ? 'bg-slate-600 cursor-not-allowed'
                    : newPost
                    ? 'bg-green-600'
                    : 'bg-blue-600'
                } px-4 py-2 rounded-md text-white flex justify-center items-center`}
              >
                <p className='text-sm'>
                  {isCreatingPost
                    ? 'Posting...'
                    : newPost
                    ? 'Posted!'
                    : 'Post'}
                </p>
              </button>
            </div>
            {allFiles && allFiles.length > 0 && (
              <div className='flex flex-row gap-2 flex-wrap py-2'>
                {allFiles.map((x, index) => (
                  <Media
                    size='tile'
                    isRemoveable={!!x.url}
                    onRemove={async () =>
                      await removePickedFileAtIndex(index)
                    }
                    isProcessing={isCreatingPost || !x.url}
                    key={x.url || x.file.name}
                    link={
                      x.url
                        ? `https://storage.googleapis.com/dev-news/${x.url}`
                        : URL.createObjectURL(x.file)
                    }
                    type={
                      x.file.type.search('video') >= 0
                        ? 'video'
                        : 'image'
                    }
                  />
                ))}
              </div>
            )}
            {/* TODO: decide how to display this error */}
            {error && (
              <p className='bg-red-400 px-2 py-1 rounded-full'>
                {error}
              </p>
            )}
          </>
        )}
      </MediaPicker>
      <Input name='title' placeholder='Enter title' hookToForm />
      <RichTextEditor
        name='content'
        placeholder="What's on your mind?"
        onLinkAdded={handleLinkAdded}
        hookToForm
      />
      {(youtubeId || linkPreview) && (
        <LinkPreview
          isRemoveable
          type='detailed'
          {...linkPreview}
          youtubeId={youtubeId}
          onRemove={removeLinkPreview}
        />
      )}
    </Form>
  )
}

export default CreatePost
