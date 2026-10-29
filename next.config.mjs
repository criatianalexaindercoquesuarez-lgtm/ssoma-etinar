/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Generación de PDF y Excel en el servidor (funciones de Netlify)
    serverComponentsExternalPackages: ['@react-pdf/renderer', 'exceljs'],
  },
};

export default nextConfig;
