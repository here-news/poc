import dynamic from 'next/dynamic'
import React, { useEffect, useRef, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { ReactQuillProps } from 'react-quill'
import 'react-quill/dist/quill.snow.css'

// [Important]: exceptionally rendering text editor without ssr
const ReactQuillWithoutSSRWrapper = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill')
    const { default: MagicUrl } = await import('quill-magic-url')

    interface RQP extends ReactQuillProps {
      forwardedRef: any
    }

    RQ.Quill.register('modules/magicUrl', MagicUrl)

    return ({ forwardedRef, ...props }: RQP) => (
      <RQ ref={forwardedRef} {...props} />
    )
  },
  {
    ssr: false,
    loading: () => <textarea /> // ideally this should be a better ux enperience, a skeletion loader for example
  }
)

interface IRichTextEditor {
  id?: string
  name?: string
  placeholder?: string
  hookToForm?: boolean
  onChange?: (text: string) => void
  onLinkAdded?: (text: string) => void
}

function RickTextEditor({
  id,
  name,
  placeholder,
  hookToForm,
  onChange,
  onLinkAdded
}: IRichTextEditor) {
  const formContext = useFormContext()
  const [isRegistered, setIsRegistered] = useState<boolean>()
  const lastLinkRef = useRef<string>()
  const reactQuillRef = useRef()

  const isFullyHooked = name && hookToForm && formContext

  const fieldError =
    isFullyHooked && formContext?.formState?.errors?.[name]?.message

  const onTextChange = async (text: string) => {
    if (isFullyHooked) {
      formContext.setValue(name, text)
      formContext.trigger([name])
    }

    // fire the change callback
    onChange && (await onChange(text))

    // check if text contains any links (Note: ideally the regex here should be a utility)
    const links = text.match(
      /(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$])/gim
    )

    // if text has a new link, fire the link added callback
    if (
      links &&
      links.length > 0 &&
      onLinkAdded &&
      lastLinkRef.current !== links.at(-1)
    ) {
      lastLinkRef.current = links.at(-1) as string
      await onLinkAdded(lastLinkRef.current)
    }
  }

  const dismissFieldError = () => {
    if (isFullyHooked) formContext.clearErrors(name)
  }

  // Register the form initially
  useEffect(() => {
    if (isFullyHooked && !isRegistered) {
      formContext.register(name)
      setIsRegistered(true)
    }
  }, [formContext, isRegistered])

  return (
    <label
      {...(id && { htmlFor: id })}
      className={'rounded-md w-full'}
    >
      <ReactQuillWithoutSSRWrapper
        {...(id && { id: id })}
        theme='snow'
        placeholder={placeholder}
        forwardedRef={reactQuillRef}
        onChange={onTextChange}
        onBlur={dismissFieldError}
        className={`w-full bg-white border-[1px] ${
          hookToForm && fieldError && fieldError
            ? 'border-red-600'
            : 'border-slate-200'
        }`}
        modules={{ magicUrl: true }}
      />
      {isFullyHooked && fieldError && (
        <p className='text-red-600 text-sm'>{fieldError as string}</p>
      )}
    </label>
  )
}

RickTextEditor.defaultProps = {
  placeholder: ''
}

export default RickTextEditor
