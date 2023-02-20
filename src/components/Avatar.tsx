import React from 'react'
import DefaultAvatar from 'assets/avatar.png'
import Image from 'next/image'

interface AvatarProps {
  imageUrl?: string | null
  containerClassNames?: string
  iamgeClassNames?: string
  bg?: 'light' | 'dark'
}

function Avatar({
  imageUrl,
  containerClassNames,
  iamgeClassNames,
  bg
}: AvatarProps) {
  return (
    <div
      className={`relative rounded-full overflow-hidden ${
        containerClassNames ? containerClassNames : ''
      } `}
    >
      <Image
        src={imageUrl ? imageUrl : DefaultAvatar}
        fill
        alt='post image'
        className={`p-1 object-contain ${
          bg && bg === 'light' ? 'bg-white' : 'bg-black'
        } ${iamgeClassNames ? iamgeClassNames : ''}`}
      />
    </div>
  )
}

export default Avatar
