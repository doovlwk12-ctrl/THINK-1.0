import { NextResponse } from 'next/server'
import { getApiAuth } from '@/lib/getApiAuth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const auth = await getApiAuth(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const dbUser = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, name: true, email: true, role: true },
  })
  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  return NextResponse.json({
    user: {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
    },
  })
}
