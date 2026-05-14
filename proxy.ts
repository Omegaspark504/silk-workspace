import { withAuth } from 'next-auth/middleware';

const authProxy = withAuth({
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export default authProxy;
export const proxy = authProxy;

export const config = {
  matcher: [
    '/inbox/:path*',
    '/notes/:path*',
    '/todo/:path*',
    '/settings/:path*',
    '/secret/:path*',
  ],
};
