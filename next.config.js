/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'localhost',
      'poc.here.news',
      'staging-dot-phonic-jetty-356702.uc.r.appspot.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**'
      }
    ]
  }
}

module.exports = nextConfig
