# حل مشكلة الجداول المفقودة
# Solution for Missing Tables Issue

## المشكلة / Problem
الجداول الخاصة بـ TENANT_APPS (course, enrollment, exam, etc.) غير موجودة في public schema رغم أن migrations تم تشغيلها.

## الحل النهائي / Final Solution

المشكلة أن django-tenants لا ينشئ الجداول في public schema بشكل صحيح. الحل هو:

### الطريقة 1: استخدام tenant.set_schema_to()

```python
from django_tenants.utils import schema_context
from tenant.models import Client

client = Client.objects.get(schema_name='public')
with schema_context('public'):
    # Run migrations here
    call_command('migrate', run_syncdb=True)
```

### الطريقة 2: إنشاء الجداول مباشرة (إذا فشلت الطريقة 1)

استخدم السكريبت `create_tables_manually.py` الذي أنشأناه سابقاً.

### الطريقة 3: إعادة إنشاء قاعدة البيانات (حل نهائي)

إذا استمرت المشكلة، قد تحتاج إلى:
1. حذف قاعدة البيانات
2. إنشاء قاعدة بيانات جديدة
3. تشغيل migrations من الصفر

## ملاحظة مهمة / Important Note

المشكلة قد تكون في إعدادات django-tenants. تأكد من:
- `SHOW_PUBLIC_IF_NO_TENANT_FOUND = True` في settings.py
- tenant 'public' موجود في جدول `tenant_client`
- migrations مسجلة بشكل صحيح في `django_migrations`
