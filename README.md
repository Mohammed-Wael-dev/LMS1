# LMS SaaS Project - Local Development Setup

## المشروع يحتوي على:
- **Backend**: Django (Python) في مجلد `LMS-saas-django-main`
- **Frontend**: React + Vite في مجلد `lms-saas-react-dev/lms-saas-react-dev`

## طريقة التشغيل السريعة / Quick Start

### الطريقة الأولى: استخدام السكريبت التلقائي
```powershell
.\run-local.ps1
```

### الطريقة الثانية: التشغيل اليدوي

#### 1. تشغيل Backend (Django)

```powershell
# الانتقال لمجلد الباك إند
cd LMS-saas-django-main

# إنشاء بيئة افتراضية (إذا لم تكن موجودة)
python -m venv venv

# تفعيل البيئة الافتراضية
.\venv\Scripts\Activate.ps1

# تثبيت المكتبات
pip install -r requirements.txt

# إنشاء ملف .env (إذا لم يكن موجوداً)
# يحتاج الملف المتغيرات التالية:
# SECRET_KEY=your-secret-key
# DEBUG=True
# POSTGRES_DB=lms_db
# POSTGRES_USER=postgres
# POSTGRES_PASSWORD=postgres
# POSTGRES_HOST=localhost
# POSTGRES_PORT=5432

# تشغيل المايجريشن (إذا كانت قاعدة البيانات جاهزة)
python manage.py migrate

# تشغيل السيرفر
python manage.py runserver
```

Backend سيعمل على: `http://localhost:8000`

#### 2. تشغيل Frontend (React)

افتح نافذة PowerShell جديدة:

```powershell
# الانتقال لمجلد الفرونت إند
cd lms-saas-react-dev\lms-saas-react-dev

# تثبيت المكتبات (استخدم pnpm أو npm)
pnpm install
# أو
npm install

# تشغيل السيرفر
pnpm dev
# أو
npm run dev
```

Frontend سيعمل على: `https://localhost:5173`

## إنشاء مستخدم للدخول / Creating a User Account

بعد تشغيل المشروع، تحتاج لإنشاء مستخدم superuser للدخول على لوحة التحكم:

### الطريقة الأولى: استخدام السكريبت
```powershell
.\create-superuser.ps1
```

### الطريقة الثانية: يدوياً
```powershell
cd LMS-saas-django-main
.\venv\Scripts\Activate.ps1
python manage.py createsuperuser
```

ستُطلب منك إدخال:
- **Email** (مطلوب) - البريد الإلكتروني
- **First Name** (اختياري) - الاسم الأول
- **Last Name** (اختياري) - اسم العائلة
- **Password** (مطلوب) - كلمة المرور

بعد إنشاء المستخدم، يمكنك الدخول على:
- **Admin Panel**: `http://localhost:8000/admin/`
- **API**: استخدام endpoints المصادقة في الواجهة الأمامية

## المتطلبات / Requirements

- **Python 3.8+** - [تحميل Python](https://www.python.org/downloads/)
- **Node.js 18+** - [تحميل Node.js](https://nodejs.org/)
- **PostgreSQL** (للباك إند) - [تحميل PostgreSQL](https://www.postgresql.org/download/)
- **pnpm** (اختياري، يمكن استخدام npm) - `npm install -g pnpm`

## ملاحظات مهمة / Important Notes

1. **قاعدة البيانات**: تأكد من أن PostgreSQL يعمل وأن قاعدة البيانات موجودة
2. **ملف .env**: يجب إنشاء ملف `.env` في مجلد `LMS-saas-django-main` مع المتغيرات المطلوبة
3. **البيئة الافتراضية**: يُنصح باستخدام بيئة Python افتراضية (venv)
4. **البورتات**: 
   - Backend: `8000`
   - Frontend: `5173`

## استكشاف الأخطاء / Troubleshooting

### مشاكل Backend:
- تأكد من تفعيل البيئة الافتراضية
- تأكد من تثبيت جميع المكتبات: `pip install -r requirements.txt`
- تأكد من إعدادات قاعدة البيانات في ملف `.env`

### مشاكل Frontend:
- احذف مجلد `node_modules` وجرب التثبيت مرة أخرى
- تأكد من تثبيت Node.js بشكل صحيح

---

## Project Structure

- **Backend**: Django REST Framework with PostgreSQL
- **Frontend**: React + TypeScript + Vite + Tailwind CSS


