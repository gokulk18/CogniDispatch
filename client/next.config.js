/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  async rewrites() {
    return [
      // Health check (previously served by Nginx gateway)
      {
        source: '/api/health',
        destination: 'http://localhost:5005/api/dispatches/health',
      },
      // Auth Service
      {
        source: '/api/auth/:path*',
        destination: 'http://localhost:5001/api/auth/:path*',
      },
      // Vendor Service
      {
        source: '/api/vendors/:path*',
        destination: 'http://localhost:5002/api/vendors/:path*',
      },
      // AI Speech Service
      {
        source: '/api/ai/:path*',
        destination: 'http://localhost:5003/api/ai/:path*',
      },
      // Payment Service
      {
        source: '/api/payments/:path*',
        destination: 'http://localhost:5006/api/payments/:path*',
      },
      // Admin Service
      {
        source: '/api/admin/:path*',
        destination: 'http://localhost:5004/api/admin/:path*',
      },
      // Dispatch Service
      {
        source: '/api/dispatches/:path*',
        destination: 'http://localhost:5005/api/dispatches/:path*',
      },
      // WebSockets (Handled by Dispatch Service)
      {
        source: '/socket.io',
        destination: 'http://localhost:5005/socket.io',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:5005/socket.io/:path*',
      }
    ];
  },
};

module.exports = nextConfig;
