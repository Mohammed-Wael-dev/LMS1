# إعداد قاعدة البيانات المحلية / Local Database Setup

## الخطوات / Steps:

### 1. إنشاء قاعدة البيانات في PostgreSQL

افتح PowerShell أو Command Prompt واكتب:

```bash
psql -U postgres
```

أدخل كلمة مرور PostgreSQL عندما يُطلب منك.

ثم داخل psql، اكتب:

```sql
CREATE DATABASE lms_db;
\q
```

أو في سطر واحد:

```bash
psql -U postgres -c "CREATE DATABASE lms_db;"
```

### 2. إنشاء ملف .env

الملف موجود في: `LMS-saas-django-main/.env`

إذا لم يكن موجوداً، أنشئه بالبيانات التالية:

```
SECRET_KEY=django-insecure-dev-key-12345
DEBUG=True
POSTGRES_DB=lms_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
GOOGLE_RECAPTCHA_SECRET_KEY=6LfBL9QrAAAAADgxfHXejdcTYuf-RVT8b_8aj-8r
```

**مهم**: استبدل `your_postgres_password` بكلمة مرور PostgreSQL الخاصة بك!

### 3. تشغيل Migrations

```powershell
cd LMS-saas-django-main
.\venv\Scripts\Activate.ps1
python manage.py migrate
```

### 4. إنشاء المستخدم

```powershell
python create_admin.py
```

أو استخدم السكريبت:

```powershell
cd ..
.\create-admin-user.ps1
```

## بيانات الدخول / Login Credentials

بعد إنشاء المستخدم:
- **Email**: `admin@gmail.com`
- **Password**: `123`
- **Admin Panel**: `http://localhost:8000/admin/`

---

## Alternative: استخدام SQLite (للتطوير فقط)

إذا كنت تريد استخدام SQLite بدلاً من PostgreSQL (للتطوير فقط):

1. عدّل `LMS-saas-django-main/project/settings.py`:

```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}
```

**ملاحظة**: هذا لن يعمل مع django-tenants بشكل كامل. يُنصح باستخدام PostgreSQL.

