import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    // Строгий режим React — двойной рендеринг в dev для выявления проблем
    reactStrictMode: true,
    typescript: {
        ignoreBuildErrors: true,
    },
}

export default nextConfig
