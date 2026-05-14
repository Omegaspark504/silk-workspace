import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from './mongodb';
import User from '../models/User';

// Fall back to empty string at build time; NextAuth will reject auth attempts at runtime if missing
const googleClientId = process.env.GOOGLE_CLIENT_ID ?? '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error('Missing email or password');
          return null;
        }

        try {
          await dbConnect();
          const email = credentials.email.toLowerCase();
          const user = await User.findOne({ email });
          
          if (!user) {
            console.error('User not found:', email);
            return null;
          }
          
          if (!user.passwordHash) {
            console.error('User has no password hash (OAuth account):', email);
            return null;
          }

          const valid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!valid) {
            console.error('Invalid password for user:', email);
            return null;
          }

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            image: user.image,
          };
        } catch (error) {
          console.error('Credentials authorize error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }: any) {
      try {
        if (account?.provider === 'google' && user.email) {
          await dbConnect();
          const email = user.email.toLowerCase();
          const existing = await User.findOne({ email });
          if (!existing) {
            await User.create({
              name: user.name || 'User',
              email,
              passwordHash: '',
              image: user.image || null,
            });
          } else if (user.image && existing.image !== user.image) {
            existing.image = user.image;
            await existing.save();
          }
        }
      } catch (error) {
        console.error('signIn callback error:', error);
        return false;
      }
      return true;
    },
    async session({ session, token }: any) {
      if (session.user && token) {
        session.user.id = token.sub;
        session.user.name = token.name || session.user.name;
        session.user.email = token.email || session.user.email;
        session.user.image = token.image || session.user.image;
      }
      return session;
    },
    async jwt({ token, user, account }: any) {
      if (user) {
        if (account?.provider === 'google') {
          // For Google OAuth, token.sub defaults to the Google user ID.
          // Look up the MongoDB _id so all providers share the same sub format.
          try {
            await dbConnect();
            const dbUser = await User.findOne({ email: user.email }).select('_id').lean();
            if (dbUser) {
              token.sub = (dbUser as any)._id.toString();
            }
          } catch (error) {
            console.error('JWT Google user lookup error:', error);
          }
        } else {
          token.sub = user.id;
        }
        token.name = user.name;
        token.image = (user.image && !user.image.startsWith('data:')) ? user.image : null;
        token.email = user.email;
      }
      // No DB lookup on every session read — JWT already carries name/email/image from sign-in.
      return token;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
