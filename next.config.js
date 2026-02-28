/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        reactCompiler: false,
    },
    images: {
        remotePatterns: [
            // Google Images
            {
                protocol: 'https',
                hostname: 'encrypted-tbn0.gstatic.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'encrypted-tbn1.gstatic.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'encrypted-tbn2.gstatic.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'encrypted-tbn3.gstatic.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                port: '',
                pathname: '/**',
            },
            // YouTube Images
            {
                protocol: 'https',
                hostname: 'i.ytimg.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'img.youtube.com',
                port: '',
                pathname: '/**',
            },
            // Common website domains
            {
                protocol: 'https',
                hostname: '*.googleapis.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'www.google.com',
                port: '',
                pathname: '/**',
            },
            // Add more common domains
            {
                protocol: 'https',
                hostname: '*.wp.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '*.cloudfront.net',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '*.amazonaws.com',
                port: '',
                pathname: '/**',
            },
            // Catch-all for any domain (be careful with this in production)
            {
                protocol: 'https',
                hostname: '**',
                port: '',
                pathname: '/**',
            },
        ],
    },
}

module.exports = nextConfig