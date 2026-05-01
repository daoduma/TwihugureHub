/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["bcryptjs", "@prisma/client", "prisma"],
  },
};

export default nextConfig;
