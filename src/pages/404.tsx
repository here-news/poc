import Layout from 'components/Layouts'
import Link from 'next/link'

const Custom404 = () => {
  return (
    <Layout pageTitle="404 Not Found" type="base">
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-4xl font-bold mb-4">
          404 - Page Not Found
        </h1>
        <p className="text-lg mb-4">
          The page you are looking for does not exist.
        </p>
        <Link href="/">
          <p className="text-blue-500 hover:underline">
            Go back to the homepage
          </p>
        </Link>
      </div>
    </Layout>
  )
}

export default Custom404
