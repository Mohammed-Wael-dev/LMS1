#!/usr/bin/env python
"""Create admin user script"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    django.setup()
except Exception as e:
    print(f"Error setting up Django: {e}")
    sys.exit(1)

from account.models import User

email = 'admin@gmail.com'
password = '123'
first_name = 'Admin'
last_name = 'User'

try:
    # Check if user already exists
    if User.objects.filter(email=email).exists():
        user = User.objects.get(email=email)
        # Update to superuser if not already
        user.is_superuser = True
        user.is_staff = True
        user.is_active = True
        user.set_password(password)
        user.first_name = first_name
        user.last_name = last_name
        user.save()
        print('[OK] User already exists. Updated to superuser!')
    else:
        # Create new superuser
        user = User.objects.create_superuser(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        print('[OK] Superuser created successfully!')
    
    print(f'Email: {user.email}')
    print(f'Name: {user.first_name} {user.last_name}')
    print(f'Is Superuser: {user.is_superuser}')
    print(f'Is Staff: {user.is_staff}')
    print('\n[OK] Done! You can now login with:')
    print(f'  Email: {email}')
    print(f'  Password: {password}')
    print('\nAdmin panel: http://localhost:8000/admin/')
except Exception as e:
    print(f'[ERROR] Error: {str(e)}')
    import traceback
    traceback.print_exc()
    sys.exit(1)

