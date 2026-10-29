import { type DefaultSession } from 'next-auth';
import { type JWT as DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'admin';
      username: string;
      displayName?: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: 'admin';
    username: string;
    displayName?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: 'admin';
    username?: string;
    displayName?: string;
  }
}

