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
        const log = (msg: string, data: Record<string, unknown>) => {
          fetch('http://127.0.0.1:7242/ingest/dea19849-5605-4cf4-baa5-fd295f0b235a', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location: 'lib/auth.ts:authorize', message: msg, data, timestamp: Date.now(), hypothesisId: 'H401' }),
          }).catch(() => {})
        }
        // #endregion
        if (!credentials?.email || !credentials?.password) {
          log('authorize reject', { reason: 'missing_credentials' })
          throw new Error('البريد الإلكتروني وكلمة المرور مطلوبان')
        }

        let user
        try {
          user = await prisma.user.findUnique({
            where: { email: credentials.email },
          })
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error)
          log('authorize error', { reason: 'db_error', errorMessage: msg })
          const isConnectionError =
            /can't reach database server|econnrefused|connection refused|econnreset/i.test(msg)
          if (isConnectionError) {
            throw new Error('تعذر الاتصال بقاعدة البيانات. تأكد من إعدادات قاعدة البيانات ثم أعد المحاولة.')
          }
          throw error
        }

        if (!user) {
          log('authorize reject', { reason: 'user_not_found', email: credentials.email })
          throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة')
        }

        const passwordHash = user.password
        if (!passwordHash) {
          log('authorize reject', { reason: 'no_password_hash', userId: user.id })
          throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة')
        }
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          passwordHash
        )

        if (!isPasswordValid) {
          log('authorize reject', { reason: 'invalid_password', userId: user.id })
          throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة')
        }

        log('authorize success', { userId: user.id })
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
