import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// Ensure environment variables are loaded correctly
const isProduction = process.env.NODE_ENV === 'production';
const baseUrl = process.env.NEXTAUTH_URL || (isProduction ? 'https://gjadt.org' : 'http://localhost:3000');

console.log('NextAuth Configuration:', {
  environment: process.env.NODE_ENV,
  baseUrl,
  hasGoogleCredentials: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
});

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          await dbConnect();
          const user = await User.findOne({ email: credentials.email });

          if (!user || !user.comparePassword) {
            return null;
          }

          const isPasswordValid = await user.comparePassword(credentials.password);

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            roles: user.roles || ['author'],
            currentActiveRole: user.currentActiveRole || user.role || 'author',
            isFounder: user.isFounder || false,
            image: user.profileImage,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          await dbConnect();
          
          let existingUser = await User.findOne({ email: user.email });
          
          if (!existingUser) {
            existingUser = await User.create({
              name: user.name,
              email: user.email,
              googleId: account.providerAccountId,
              profileImage: user.image,
              isEmailVerified: true,
              role: 'author',
              roles: ['author'],
              currentActiveRole: 'author',
              isFounder: false,
            });
          } else if (!existingUser.googleId) {
            existingUser.googleId = account.providerAccountId;
            existingUser.isEmailVerified = true;
            if (!existingUser.profileImage) {
              existingUser.profileImage = user.image;
            }
            await existingUser.save();
          }
          
          user.role = existingUser.role;
          user.roles = existingUser.roles || ['author'];
          user.currentActiveRole = existingUser.currentActiveRole || existingUser.role || 'author';
          user.isFounder = existingUser.isFounder || false;
          user.id = existingUser._id.toString();
          
          return true;
        } catch (error) {
          console.error('Google sign in error:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.role = user.role;
        token.roles = user.roles;
        token.currentActiveRole = user.currentActiveRole;
        token.isFounder = user.isFounder;
        token.id = user.id;
      }
      
      // If session update is triggered, refresh user data from database
      if (trigger === 'update' && session?.user?.currentActiveRole) {
        try {
          await dbConnect();
          const dbUser = await User.findById(token.id);
          if (dbUser) {
            token.role = dbUser.role;
            token.roles = dbUser.roles;
            token.currentActiveRole = dbUser.currentActiveRole;
            token.isFounder = dbUser.isFounder;
          }
        } catch (error) {
          console.error('Error refreshing user data in JWT callback:', error);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'author' | 'reviewer' | 'editor' | 'copy-editor' | 'admin';
        session.user.roles = token.roles as ('author' | 'reviewer' | 'editor' | 'copy-editor' | 'admin')[];
        session.user.currentActiveRole = token.currentActiveRole as 'author' | 'reviewer' | 'editor' | 'copy-editor' | 'admin';
        session.user.isFounder = token.isFounder as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
