import type { Metadata } from 'next';
import './globals.css';
import AuthSessionProvider from './components/AuthSessionProvider';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../lib/auth';

export const metadata: Metadata = {
  title: 'Silk Workspace',
  description: 'Your minimalist productivity workspace.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthSessionProvider session={session}>
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
