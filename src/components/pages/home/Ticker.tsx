import Link from 'next/link'
import React from 'react'

interface TickerProps {
  changeActivePage: (page: string) => void
}

function Ticker({changeActivePage}: TickerProps) {
  return (
    <div className='mb-2 h-6'>
      <div className='fixed left-0 right-0 top-13 z-[2]'>
        <div className='flex-1 flex items-center justify-center px-4 h-6 bg-gray-900 overflow-hidden'>
          <h1
            onClick={() => changeActivePage('explore')}
            className='cursor-pointer text-xs text-white'
          >
            <Link href='/explore'>Explore</Link>
          </h1>
        </div>
      </div>
    </div>
  )
}

export default Ticker
