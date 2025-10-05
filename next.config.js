/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sqlite3', 'pdf-parse']
  },
  api: {
    bodyParser: {
      sizeLimit: '50mb'
    }
  }
}

module.exports = nextConfig