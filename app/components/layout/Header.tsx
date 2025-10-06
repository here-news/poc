import React from 'react'
import UserProfile from '../../UserProfile'
import logoAsset from '../../assets/here_pin_logo.svg'

interface HeaderProps {
  userId: string
}

function Header({ userId }: HeaderProps) {
  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative h-14 sm:h-16">
        <img
          src={logoAsset}
          alt="Here Pin Logo"
          className="h-full w-auto drop-shadow-sm"
        />
      </div>
      <div className="self-start sm:self-auto">
        <UserProfile userId={userId} />
      </div>
    </header>
  )
}

export default Header
