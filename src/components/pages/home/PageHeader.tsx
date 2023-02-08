import React, { useState } from 'react'

const pages = [
  {
    name: 'Explore',
    value: 'explore'
  },
  {
    name: 'Trending',
    value: 'trending'
  }
]
function PageHeader() {
  const [activePage, setActivePage] = useState('explore')

  const changeActivePage = (page: string) => {
    setActivePage(page)
  }

  return (
    <div className='mb-12 h-12'>
      <header className='flex items-center justify-center p-0 fixed left-0 right-0 top-0 h-12 my-12'>
        <div
          className='grid h-full max-w-[40rem]'
          style={{
            flex: '1 1 0%'
          }}
        >
          <div className='bg-white flex justify-evenly items-center'>
            {pages.map(page => {
              return (
                <div
                  key={page.value}
                  className={`${
                    activePage === page.value
                      ? 'border-b-2 border-blue-600'
                      : 'cursor-pointer'
                  } flex items-center justify-center flex-1 h-full`}
                  onClick={() =>
                    activePage !== page.value
                      ? changeActivePage(page.value)
                      : {}
                  }
                >
                  <p
                    className={`text-sm font-semibold ${
                      activePage === page.value
                        ? 'text-blue-600'
                        : 'text-slate-600'
                    }`}
                  >
                    {page.name}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </header>
    </div>
  )
}

export default PageHeader
