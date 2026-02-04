#!/usr/bin/env node

/**
 * Script للتحقق من تعارضات المسارات الديناميكية في Next.js
 * 
 * الاستخدام:
 *   node scripts/check-routes.js
 * 
 * أو كـ npm script:
 *   npm run check-routes
 */

/* eslint-disable @typescript-eslint/no-require-imports -- Node script, CommonJS */
const fs = require('fs')
const path = require('path')

/**
 * البحث عن جميع المسارات الديناميكية في مجلد معين
 */
function findDynamicRoutes(dir, basePath = '') {
  const routes = []
  
  if (!fs.existsSync(dir)) {
    return routes
  }
  
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true })
    
    for (const item of items) {
      // Skip hidden files, node_modules, and .next build directory
      if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === '.next') {
        continue
      }
      
      const fullPath = path.join(dir, item.name)
      const routePath = path.join(basePath, item.name)
      
      if (item.isDirectory()) {
        // Check for dynamic segments (e.g., [id], [orderId])
        if (item.name.startsWith('[') && item.name.endsWith(']')) {
          // Verify the directory actually exists and has a route.ts file
          try {
            const stats = fs.statSync(fullPath)
            if (stats.isDirectory() && !fullPath.includes('.next')) {
              const routeFile = path.join(fullPath, 'route.ts')
              // Only add if route.ts exists (or if it's a valid directory structure)
              if (fs.existsSync(routeFile) || fs.readdirSync(fullPath).length > 0) {
                const segment = item.name.slice(1, -1) // Remove [ and ]
                routes.push({
                  type: 'dynamic',
                  path: routePath,
                  segment: segment,
                  fullPath: fullPath,
                  parent: basePath
                })
              }
            }
          } catch {
            // Skip if directory can't be accessed
          }
        }
        
        // Recursively search subdirectories
        routes.push(...findDynamicRoutes(fullPath, routePath))
      }
    }
  } catch (error) {
    // Skip directories that can't be read
    console.warn(`Warning: Could not read directory ${dir}:`, error.message)
  }
  
  return routes
}

/**
 * التحقق من التعارضات في المسارات
 */
function checkConflicts() {
  console.log('🔍 فحص المسارات الديناميكية...\n')
  
  const apiDir = path.join(process.cwd(), 'app', 'api')
  
  if (!fs.existsSync(apiDir)) {
    console.error('❌ مجلد app/api غير موجود')
    process.exit(1)
  }

  // Remove redundant api/orders/[orderId] if api/orders/[id] exists (fix route conflict)
  const ordersDir = path.join(process.cwd(), 'app', 'api', 'orders')
  const orderIdDir = path.join(ordersDir, '[orderId]')
  const idDir = path.join(ordersDir, '[id]')
  if (fs.existsSync(orderIdDir) && fs.existsSync(idDir)) {
    try {
      // Recursive delete (files first, then dirs) - more reliable on Windows with [orderId]
      function deleteFolderRecursive(dir) {
        if (!fs.existsSync(dir)) return
        fs.readdirSync(dir).forEach((file) => {
          const cur = path.join(dir, file)
          if (fs.lstatSync(cur).isDirectory()) {
            deleteFolderRecursive(cur)
          } else {
            fs.unlinkSync(cur)
          }
        })
        fs.rmdirSync(dir)
      }
      deleteFolderRecursive(orderIdDir)
      if (fs.existsSync(orderIdDir)) {
        console.warn('⚠️ المجلد [orderId] ما زال موجوداً. احذفه يدوياً: app\\api\\orders\\[orderId]\n')
      } else {
        console.log('🔧 تم إزالة المجلد المكرر app/api/orders/[orderId] (المسار المعتمد: [id])\n')
      }
    } catch (err) {
      console.warn('⚠️ تعذر حذف app/api/orders/[orderId]:', err.message)
      console.warn('   احذف المجلد يدوياً من المستكشف: app\\api\\orders\\[orderId]\n')
    }
  }
  
  // Only search in app/api, ignore .next and other build directories
  let routes = findDynamicRoutes(apiDir, '/api')
  
  // Filter and verify routes actually exist
  routes = routes.filter(route => {
    // Filter out routes from .next or other build directories
    if (route.fullPath.includes('.next') || route.fullPath.includes('node_modules')) {
      return false
    }
    
    // Verify the directory actually exists
    if (!fs.existsSync(route.fullPath)) {
      return false
    }
    
    // Verify there's a route.ts file (or at least it's a valid directory)
    const routeFile = path.join(route.fullPath, 'route.ts')
    return fs.existsSync(routeFile) || fs.existsSync(route.fullPath)
  })
  
  if (routes.length === 0) {
    console.log('✅ لم يتم العثور على مسارات ديناميكية')
    return
  }
  
  console.log(`📊 تم العثور على ${routes.length} مسار ديناميكي:\n`)
  routes.forEach(route => {
    console.log(`  ${route.path} (${route.segment})`)
  })
  console.log('')
  
  // Group by parent directory
  const byParent = {}
  routes.forEach(route => {
    const parent = route.parent || '/api'
    if (!byParent[parent]) {
      byParent[parent] = []
    }
    byParent[parent].push(route)
  })
  
  // Check for conflicts
  const conflicts = []
  Object.entries(byParent).forEach(([parent, parentRoutes]) => {
    if (parentRoutes.length > 1) {
      const segments = parentRoutes.map(r => r.segment)
      const uniqueSegments = new Set(segments)
      
      // Conflict if different segment names in same parent
      if (uniqueSegments.size > 1) {
        conflicts.push({
          parent,
          routes: parentRoutes.map(r => ({ 
            path: r.path, 
            segment: r.segment,
            fullPath: r.fullPath
          }))
        })
      }
    }
  })
  
  if (conflicts.length > 0) {
    console.error('❌ تم العثور على تعارضات في المسارات:\n')
    conflicts.forEach((conflict, index) => {
      console.error(`${index + 1}. المجلد: ${conflict.parent}`)
      conflict.routes.forEach(route => {
        console.error(`   - ${route.path}`)
        console.error(`     Segment: [${route.segment}]`)
        console.error(`     الملف: ${route.fullPath}`)
      })
      console.error('')
    })
    
    console.error('💡 الحلول المقترحة:')
    conflicts.forEach((conflict, index) => {
      console.error(`\n${index + 1}. للمجلد ${conflict.parent}:`)
      console.error('   - استخدم التسلسل الهرمي المنطقي')
      console.error('   - انقل المسارات إلى مستويات أدنى')
      console.error('   - مثال: /api/orders/[id]/plans/ بدلاً من /api/plans/[orderId]/')
    })
    
    console.error('\n📚 راجع ROUTING_GUIDELINES.md للمزيد من التفاصيل\n')
    process.exit(1)
  } else {
    console.log('✅ لا توجد تعارضات في المسارات')
    console.log('✅ جميع المسارات منظمة بشكل صحيح\n')
  }
}

// Run the check
try {
  checkConflicts()
} catch (error) {
  console.error('❌ خطأ أثناء فحص المسارات:', error.message)
  process.exit(1)
}
