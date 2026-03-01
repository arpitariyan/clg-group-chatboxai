/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    reactCompiler: false,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'encrypted-tbn0.gstatic.com', pathname: '/**' },
      { protocol: 'https', hostname: 'encrypted-tbn1.gstatic.com', pathname: '/**' },
      { protocol: 'https', hostname: 'encrypted-tbn2.gstatic.com', pathname: '/**' },
      { protocol: 'https', hostname: 'encrypted-tbn3.gstatic.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/**' },
      { protocol: 'https', hostname: 'img.youtube.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'www.google.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.wp.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.cloudfront.net', pathname: '/**' },
      { protocol: 'https', hostname: '*.amazonaws.com', pathname: '/**' },
      // Catch-all for any HTTPS domain
      { protocol: 'https', hostname: '**', pathname: '/**' },
    ],
  },
};

export default nextConfig;
