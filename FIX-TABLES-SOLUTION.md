# حل مشكلة الجداول المفقودة
# Solution for Missing Tables

## المشكلة / Problem
الجداول الخاصة بـ TENANT_APPS (course, enrollment, exam, etc.) غير موجودة في public schema رغم أن migrations تم تشغيلها.

## الحل / Solution

المشكلة أن django-tenants يحتاج tenant نشط لإنشاء الجداول. الحل هو:

1. **حذف سجلات migrations المزيفة:**
```sql
SET search_path TO public;
DELETE FROM django_migrations WHERE app IN ('course', 'enrollment', 'exam', 'cart', 'core', 'iraq_form');
```

2. **تشغيل migrations مع tenant نشط:**
```powershell
cd LMS-saas-django-main
.\venv\Scripts\Activate.ps1
python manage.py migrate_schemas --schema public --run-syncdb
```

3. **إذا لم تعمل، استخدم السكريبت:**
```powershell
python create_tables_manually.py
```

## ملاحظة مهمة / Important Note

إذا استمرت المشكلة، قد تحتاج إلى:
- التحقق من أن tenant 'public' موجود
- التأكد من أن SHOW_PUBLIC_IF_NO_TENANT_FOUND = True في settings.py
- إعادة إنشاء قاعدة البيانات من الصفر إذا لزم الأمر
