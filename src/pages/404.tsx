import Link from 'next/link'

const Custom404 = () => {
  return (
    <div className='flex flex-col items-center justify-center h-screen'>
      <h1 className='text-4xl font-bold mb-4'>
        404 - Page Not Found
      </h1>
      <p className='text-lg mb-4'>
        The page you are looking for does not exist.
      </p>
      <Link href='/'>
        <p className='text-blue-500 hover:underline'>
          Go back to the homepage
        </p>
      </Link>
    </div>
  )
}

export default Custom404
