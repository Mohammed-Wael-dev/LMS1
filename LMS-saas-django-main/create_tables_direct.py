#!/usr/bin/env python
"""Create tables directly using Django ORM"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from django.db import connection
from tenant.models import Client
from django.core.management import call_command
from django.apps import apps

try:
    # Get public tenant
    client = Client.objects.get(schema_name='public')
    
    # Set schema
    connection.set_schema('public')
    
    print("[INFO] Schema set to public")
    
    # Delete migration records
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM django_migrations WHERE app IN ('course', 'enrollment', 'exam', 'cart', 'core', 'iraq_form');")
        print("[INFO] Deleted migration records")
    
    # Run migrations
    print("[INFO] Running migrations...")
    call_command('migrate', verbosity=2, run_syncdb=True, interactive=False)
    
    # Verify
    with connection.cursor() as cursor:
        cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_course';")
        result = cursor.fetchone()
        if result:
            print(f"[OK] course_course table exists!")
        else:
            print("[ERROR] course_course table still missing!")
            
            # List all tables
            cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;")
            all_tables = cursor.fetchall()
            print(f"[INFO] Total tables in public schema: {len(all_tables)}")
            print("[INFO] First 10 tables:")
            for table in all_tables[:10]:
                print(f"  - {table[0]}")
            
except Exception as e:
    print(f"[ERROR] Error: {e}")
    import traceback
    traceback.print_exc()
