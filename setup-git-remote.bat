@echo off
chcp 65001 >nul
echo ========================================
echo ربط المشروع بـ GitHub
echo ========================================
echo.

REM التحقق من وجود Git
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [خطأ] Git غير مثبت. يرجى تثبيت Git أولاً.
    pause
    exit /b 1
)

echo [1/6] تهيئة مستودع Git...
git init
if %errorlevel% neq 0 (
    echo [خطأ] فشل تهيئة Git
    pause
    exit /b 1
)

echo [2/6] إضافة المستودع البعيد...
git remote remove origin 2>nul
git remote add origin https://github.com/doovlwk12-ctrl/THINK.git
if %errorlevel% neq 0 (
    echo [خطأ] فشل إضافة المستودع البعيد
    pause
    exit /b 1
)

echo [3/6] التحقق من المستودع البعيد...
git remote -v

echo [4/6] إضافة جميع الملفات...
git add .
if %errorlevel% neq 0 (
    echo [خطأ] فشل إضافة الملفات
    pause
    exit /b 1
)

echo [5/6] عمل Commit...
git commit -m "Initial commit - منصة فكرة v2.1.0"
if %errorlevel% neq 0 (
    echo [تحذير] قد يكون هناك commit موجود بالفعل
)

echo [6/6] رفع التغييرات إلى GitHub...
echo.
echo ملاحظة: قد تحتاج إلى إدخال بيانات اعتماد GitHub
echo.
git branch -M main
git pull origin main --allow-unrelated-histories 2>nul
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo ✅ تم ربط المشروع بـ GitHub بنجاح!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo ⚠️ قد تحتاج إلى إدخال بيانات اعتماد GitHub
    echo أو التحقق من الصلاحيات
    echo ========================================
)

pause
