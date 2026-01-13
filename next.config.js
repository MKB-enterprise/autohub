/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone', // desabilitado para permitir `next start`
  
  // Otimizações de performance
  // experimental options removidas; app dir já é padrão nas versões atuais
  
  // Desabilita geração de source maps em produção para build mais rápido
  productionBrowserSourceMaps: false,
  
  // Compressão automática
  compress: true,
  
  // Otimização de imagens
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    remotePatterns: process.env.NEXT_PUBLIC_BRAND_ASSET_HOST
      ? [
          {
            protocol: 'https',
            hostname: process.env.NEXT_PUBLIC_BRAND_ASSET_HOST,
            pathname: '/**',
          },
        ]
      : [],
  },
  
  // Remover console.log em produção
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Desabilita ESLint durante o build para evitar conflitos de dependência
  eslint: {
    ignoreDuringBuilds: true,
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