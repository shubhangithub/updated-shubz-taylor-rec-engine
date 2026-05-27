/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['i.scdn.co', 'mosaic.scdn.co', 'wrapped-images.spotifycdn.com', 'image-cdn-ak.spotifycdn.com', 'image-cdn-fa.spotifycdn.com'],
  },
  transpilePackages: ['three'],
}

module.exports = nextConfig
