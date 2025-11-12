import React from 'react'

interface PhiAvatarProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Phi (φ) Avatar Component
 *
 * Consistent avatar used across the site for Phi, the interplanet news oracle
 */
export function PhiAvatar({ size = 'md', className = '' }: PhiAvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-10 h-10 text-lg',
    lg: 'w-12 h-12 text-xl'
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg flex-shrink-0 ${className}`}
    >
      <span className="text-white font-bold">φ</span>
    </div>
  )
}
