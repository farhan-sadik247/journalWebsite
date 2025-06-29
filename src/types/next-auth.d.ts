import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      role: 'author' | 'reviewer' | 'editor' | 'copy-editor' | 'admin';
      roles: ('author' | 'reviewer' | 'editor' | 'copy-editor' | 'admin')[];
      currentActiveRole: 'author' | 'reviewer' | 'editor' | 'copy-editor' | 'admin';
      isFounder: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    image?: string;
    role: 'author' | 'reviewer' | 'editor' | 'copy-editor' | 'admin';
    roles: ('author' | 'reviewer' | 'editor' | 'copy-editor' | 'admin')[];
    currentActiveRole: 'author' | 'reviewer' | 'editor' | 'copy-editor' | 'admin';
    isFounder: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'author' | 'reviewer' | 'editor' | 'copy-editor' | 'admin';
    roles: ('author' | 'reviewer' | 'editor' | 'copy-editor' | 'admin')[];
    currentActiveRole: 'author' | 'reviewer' | 'editor' | 'copy-editor' | 'admin';
    isFounder: boolean;
  }
}
