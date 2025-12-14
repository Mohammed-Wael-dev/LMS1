# LMS SaaS Django - Setup Instructions

## ✅ Completed Steps

1. ✅ Virtual environment created (`venv/`)
2. ✅ All packages installed from `requirements.txt`
3. ✅ `.env` file created with default configuration

## ⚠️ Required: PostgreSQL Setup

This project uses PostgreSQL with django-tenants. You need to:

### Option 1: Update .env with your PostgreSQL credentials

Edit the `.env` file and update these values to match your PostgreSQL setup:
```
POSTGRES_USER=your_postgres_username
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_DB=lms_db
```

### Option 2: Create database and user

If you want to use the default values in `.env`, run these commands in PostgreSQL:

```sql
CREATE DATABASE lms_db;
-- If you need to create a user:
CREATE USER postgres WITH PASSWORD 'postgres';
ALTER USER postgres CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE lms_db TO postgres;
```

## 🚀 Running the Application

1. **Activate virtual environment:**
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```

2. **Run migrations:**
   ```powershell
   python manage.py migrate_schemas
   ```

3. **Create superuser (optional):**
   ```powershell
   python manage.py createsuperuser
   ```
   Or use the provided script:
   ```powershell
   python create_admin_simple.py
   ```

4. **Start development server:**
   ```powershell
   python manage.py runserver
   ```

5. **Access the application:**
   - Admin panel: http://localhost:8000/admin/
   - API: http://localhost:8000/api/

## 📝 Notes

- The default admin credentials (if using `create_admin_simple.py`):
  - Email: `admin@gmail.com`
  - Password: `123`

- Make sure PostgreSQL is running before running migrations
- The project uses django-tenants for multi-tenancy support

