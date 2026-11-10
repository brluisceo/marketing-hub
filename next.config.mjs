/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Endereços antigos (antes de cada módulo ter sua pasta) continuam funcionando. A query string é mantida.
  async redirects() {
    const antigos = [
      ['/posts', '/instagram/posts'],
      ['/posts/:id', '/instagram/posts/:id'],
      ['/stories', '/instagram/stories'],
      ['/conta', '/instagram/conta'],
      ['/sobre', '/instagram/sobre'],
      ['/usuarios', '/admin/usuarios'],
      ['/acessos', '/admin/acessos']
    ];
    return antigos.map(([source, destination]) => ({ source, destination, permanent: false }));
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' }
        ]
      }
    ];
  }
};
export default nextConfig;
