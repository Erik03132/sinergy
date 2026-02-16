import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    // Строгий режим React — двойной рендеринг в dev для выявления проблем
    reactStrictMode: true,
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
}

export default nextConfig
