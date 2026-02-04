import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // #region agent log
        try {
          if (typeof fetch !== 'undefined') {
            fetch('http://127.0.0.1:7244/ingest/a8eee1e4-a2b5-45ab-8ecd-ef5f28c71af1', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: 'debug-session',
                runId: 'run1',
                hypothesisId: 'H3',
                location: 'lib/auth.ts:authorize-start',
                message: 'authorize called',
                data: { hasEmail: !!credentials?.email, hasPassword: !!credentials?.password },
                timestamp: Date.now(),
              }),
            }).catch(() => {})
          }
        } catch {
          // ignore logging errors
        }
        // #endregion

        if (!credentials?.email || !credentials?.password) {
          throw new Error('البريد الإلكتروني وكلمة المرور مطلوبان')
        }

        // #region agent log
        try {
          if (typeof fetch !== 'undefined') {
            fetch('http://127.0.0.1:7244/ingest/a8eee1e4-a2b5-45ab-8ecd-ef5f28c71af1', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: 'debug-session',
                runId: 'run1',
                hypothesisId: 'H1',
                location: 'lib/auth.ts:before-find-unique',
                message: 'before prisma.user.findUnique',
                data: { emailProvided: true },
                timestamp: Date.now(),
              }),
            }).catch(() => {})
          }
        } catch {
          // ignore logging errors
        }
        // #endregion

        let user
        try {
          user = await prisma.user.findUnique({
            where: { email: credentials.email },
          })
        } catch (error) {
          // #region agent log
          try {
            if (typeof fetch !== 'undefined') {
              fetch('http://127.0.0.1:7244/ingest/a8eee1e4-a2b5-45ab-8ecd-ef5f28c71af1', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId: 'debug-session',
                  runId: 'run1',
                  hypothesisId: 'H1',
                  location: 'lib/auth.ts:find-unique-error',
                  message: 'prisma.user.findUnique failed',
                  data: {
                    errorMessage: error instanceof Error ? error.message : String(error),
                  },
                  timestamp: Date.now(),
                }),
              }).catch(() => {})
            }
          } catch {
            // ignore logging errors
          }
          // #endregion
          throw error
        }

        if (!user) {
          throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة')
        }

        const passwordHash = user.password
        if (!passwordHash) {
          throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة')
        }
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          passwordHash
        )

        if (!isPasswordValid) {
          throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        const userRole = (user as { role?: string }).role
        if (userRole) {
          token.role = userRole
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}
