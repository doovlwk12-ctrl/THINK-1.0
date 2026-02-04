#!/usr/bin/env node
/**
 * سكربت تنفيذي لتنظيف المشروع من المجلدات والملفات المؤقتة وتقليل الحجم.
 * التشغيل: node scripts/clean-artifacts.js [--dry-run] [--next]
 *
 * --dry-run  يعرض ما سيُحذف دون تنفيذ الحذف
 * --next    يتضمن حذف مجلد .next (بناء Next.js)
 */

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const includeNext = args.includes('--next')

const dirsToRemove = [
  '.firebase',
  'playwright-report',
  'test-results',
].concat(includeNext ? ['.next'] : [])

function removeDir(dirName) {
  const fullPath = path.join(root, dirName)
  if (!fs.existsSync(fullPath)) return { removed: false, path: fullPath, reason: 'not_found' }
  const stat = fs.statSync(fullPath)
  if (!stat.isDirectory()) return { removed: false, path: fullPath, reason: 'not_dir' }
  if (isDryRun) return { removed: false, path: fullPath, reason: 'dry_run' }
  fs.rmSync(fullPath, { recursive: true })
  return { removed: true, path: fullPath }
}

function main() {
  console.log('تنظيف مشروع منصة فكرة')
  if (isDryRun) console.log('(وضع التجربة - لا حذف فعلي)\n')

  let removedCount = 0
  for (const dir of dirsToRemove) {
    const result = removeDir(dir)
    if (result.removed) {
      console.log('✓ حُذف:', result.path)
      removedCount++
    } else if (result.reason === 'dry_run') {
      console.log('[سيُحذف]', result.path)
    } else if (result.reason === 'not_found') {
      console.log('- غير موجود:', dir)
    }
  }

  if (!isDryRun && removedCount > 0) {
    console.log('\nتم حذف', removedCount, 'مجلد/مجلدات.')
  }
  if (isDryRun) {
    console.log('\nلتنفيذ الحذف فعلياً شغّل: node scripts/clean-artifacts.js')
  }
}

main()
