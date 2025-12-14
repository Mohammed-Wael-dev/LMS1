# تحديث ملف .env / Update .env File

## المشكلة / Problem:
ملف `.env` الحالي يحتوي على إعدادات قاعدة بيانات بعيدة (DigitalOcean). يجب تحديثه لاستخدام قاعدة البيانات المحلية.

## الحل / Solution:

افتح ملف `LMS-saas-django-main/.env` وعدّله ليحتوي على:

```
SECRET_KEY=django-insecure-dev-key-12345
DEBUG=True
POSTGRES_DB=lms_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_local_postgres_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
GOOGLE_RECAPTCHA_SECRET_KEY=6LfBL9QrAAAAADgxfHXejdcTYuf-RVT8b_8aj-8r
```

**مهم**: استبدل `your_local_postgres_password` بكلمة مرور PostgreSQL المحلية الخاصة بك!

## الخطوات التالية / Next Steps:

بعد تحديث ملف .env:

1. **إنشاء قاعدة البيانات** (إذا لم تكن موجودة):
   ```powershell
   psql -U postgres -c "CREATE DATABASE lms_db;"
   ```

2. **تشغيل migrations**:
   ```powershell
   cd LMS-saas-django-main
   .\venv\Scripts\python.exe manage.py migrate
   ```

3. **إنشاء المستخدم**:
   ```powershell
   .\venv\Scripts\python.exe create_admin.py
   ```

## بيانات الدخول / Login Credentials:
- **Email**: `admin@gmail.com`
- **Password**: `123`
- **Admin Panel**: `http://localhost:8000/admin/`


