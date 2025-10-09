import React from 'react'
import { formatUserId } from './userSession'

interface UserProfileProps {
  userId: string
}

const generateGradient = (id: string) => {
  const clean = id.replace(/[^0-9a-f]/gi, '').padEnd(6, '0').slice(0, 6)
  const hue = parseInt(clean.slice(0, 2), 16) * 1.4
  const saturation = 60 + (parseInt(clean.slice(2, 4), 16) % 25)
  const lightness = 45 + (parseInt(clean.slice(4, 6), 16) % 15)

  return {
    background: `linear-gradient(135deg, hsl(${hue % 360}, ${saturation}%, ${lightness}%) 0%, hsl(${(hue + 90) % 360}, ${Math.min(90, saturation + 20)}%, ${Math.max(35, lightness - 10)}%) 100%)`
  }
}

function UserProfile({ userId }: UserProfileProps) {
  if (!userId) return null

  const shortId = formatUserId(userId)
  const initials = shortId.slice(0, 2).toUpperCase()

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shadow-md"
        style={generateGradient(userId)}
        aria-hidden="true"
      >
        {initials}
      </div>
      <div className="text-right">
        <div className="text-xs uppercase text-gray-400 tracking-wide">User</div>
        <div className="text-sm font-semibold text-gray-700" title={userId}>
          {shortId}
        </div>
      </div>
    </div>
  )
}

export default UserProfile
