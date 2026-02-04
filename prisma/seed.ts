import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create packages
  await prisma.package.upsert({
    where: { id: 'basic' },
    update: {},
    create: {
      id: 'basic',
      nameAr: 'الباقة الأساسية',
      nameEn: 'Basic Package',
      price: 500,
      revisions: 2,
      executionDays: 7,
      isActive: true,
    },
  })

  await prisma.package.upsert({
    where: { id: 'standard' },
    update: {},
    create: {
      id: 'standard',
      nameAr: 'الباقة القياسية',
      nameEn: 'Standard Package',
      price: 1000,
      revisions: 5,
      executionDays: 14,
      isActive: true,
    },
  })

  await prisma.package.upsert({
    where: { id: 'premium' },
    update: {},
    create: {
      id: 'premium',
      nameAr: 'الباقة المميزة',
      nameEn: 'Premium Package',
      price: 2000,
      revisions: 10,
      executionDays: 21,
      isActive: true,
    },
  })

  console.log('✅ Packages created')

  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 10)

  await prisma.user.upsert({
    where: { email: 'client@test.com' },
    update: {},
    create: {
      email: 'client@test.com',
      password: hashedPassword,
      name: 'عميل تجريبي',
      phone: '0501234567',
      role: 'CLIENT',
    },
  })

  await prisma.user.upsert({
    where: { email: 'engineer@test.com' },
    update: {},
    create: {
      email: 'engineer@test.com',
      password: hashedPassword,
      name: 'مهندس تجريبي',
      phone: '0507654321',
      role: 'ENGINEER',
    },
  })

  await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      password: hashedPassword,
      name: 'مدير النظام',
      phone: '0509999999',
      role: 'ADMIN',
    },
  })

  console.log('✅ Test users created')
  console.log('📧 Client: client@test.com / password123')
  console.log('📧 Engineer: engineer@test.com / password123')
  console.log('👑 Admin: admin@test.com / password123')

  console.log('✨ Seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
