#!/usr/bin/env python
"""
Complete setup script for LMS SaaS project
Creates database, runs migrations, and creates admin user
"""
import os
import sys
import subprocess
from pathlib import Path

# Change to project directory
os.chdir(Path(__file__).parent)

print("=" * 50)
print("  LMS SaaS - Complete Setup")
print("=" * 50)
print()

# Step 1: Check .env file
print("Step 1: Checking .env file...")
if not Path(".env").exists():
    print("Creating .env file...")
    db_password = input("Enter PostgreSQL password for user 'postgres': ")
    
    env_content = f"""SECRET_KEY=django-insecure-dev-key-12345
DEBUG=True
POSTGRES_DB=lms_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD={db_password}
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
GOOGLE_RECAPTCHA_SECRET_KEY=6LfBL9QrAAAAADgxfHXejdcTYuf-RVT8b_8aj-8r
"""
    with open(".env", "w", encoding="utf-8") as f:
        f.write(env_content)
    print("✓ .env file created")
else:
    print("✓ .env file exists")
    # Read password from .env
    with open(".env", "r") as f:
        for line in f:
            if line.startswith("POSTGRES_PASSWORD="):
                db_password = line.split("=", 1)[1].strip()
                break

print()

# Step 2: Create database using psql
print("Step 2: Creating database...")
print("Note: If database creation fails, please create it manually:")
print("  psql -U postgres -c 'CREATE DATABASE lms_db;'")
print()

# Try to create database using PGPASSWORD environment variable
env = os.environ.copy()
env['PGPASSWORD'] = db_password

result = subprocess.run(
    ["psql", "-U", "postgres", "-h", "localhost", "-c", "CREATE DATABASE lms_db;"],
    capture_output=True,
    text=True,
    env=env
)

if result.returncode == 0 or "already exists" in result.stderr.lower():
    print("✓ Database created or already exists")
else:
    print("⚠ Could not create database automatically.")
    print("  This is okay if the database already exists.")
    print("  We'll continue with migrations...")

print()

# Step 3: Setup Django and run migrations
print("Step 3: Setting up Django and running migrations...")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')

try:
    import django
    django.setup()
    print("✓ Django setup complete")
except Exception as e:
    print(f"✗ Django setup failed: {e}")
    print("Make sure all dependencies are installed:")
    print("  .\\venv\\Scripts\\python.exe -m pip install -r requirements.txt")
    sys.exit(1)

# Run migrations
print("Running migrations...")
from django.core.management import execute_from_command_line

try:
    execute_from_command_line(['manage.py', 'migrate'])
    print("✓ Migrations completed")
except Exception as e:
    print(f"✗ Migrations failed: {e}")
    sys.exit(1)

print()

# Step 4: Create admin user
print("Step 4: Creating admin user...")
from account.models import User

email = 'admin@gmail.com'
password = '123'
first_name = 'Admin'
last_name = 'User'

try:
    if User.objects.filter(email=email).exists():
        user = User.objects.get(email=email)
        user.is_superuser = True
        user.is_staff = True
        user.is_active = True
        user.set_password(password)
        user.first_name = first_name
        user.last_name = last_name
        user.save()
        print("✓ User already exists. Updated to superuser!")
    else:
        user = User.objects.create_superuser(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        print("✓ Superuser created successfully!")
    
    print()
    print("=" * 50)
    print("  Setup Complete!")
    print("=" * 50)
    print()
    print("Login credentials:")
    print(f"  Email: {user.email}")
    print(f"  Password: {password}")
    print()
    print("Admin Panel: http://localhost:8000/admin/")
    print()
    
except Exception as e:
    print(f"✗ Failed to create user: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

