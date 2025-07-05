import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

// Temporary configuration without database for testing Google OAuth
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // For testing purposes, return null for credentials login
        return null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          // For testing: Allow Google sign-in without database
          console.log('Google sign-in successful for:', user.email);
          
          // Set default values for testing
          user.role = 'author';
          user.roles = ['author'];
          user.currentActiveRole = 'author';
          user.isFounder = false;
          user.id = user.email; // Use email as temporary ID
          
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
        token.role = user.role || 'author';
        token.roles = user.roles || ['author'];
        token.currentActiveRole = user.currentActiveRole || 'author';
        token.isFounder = user.isFounder || false;
        token.id = user.id || user.email;
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
