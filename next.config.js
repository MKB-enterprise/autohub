/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // Otimizações de performance
  experimental: {
    // Permite streaming de componentes
    appDir: true,
  },
  
  // Desabilita geração de source maps em produção para build mais rápido
  productionBrowserSourceMaps: false,
  
  // Compressão automática
  compress: true,
  
  // Otimização de imagens
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // Remover console.log em produção
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Headers de performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig