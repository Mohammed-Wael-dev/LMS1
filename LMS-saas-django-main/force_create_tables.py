#!/usr/bin/env python
"""Force create tables for tenant apps"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from django.db import connection
from tenant.models import Client
from django.core.management import call_command

try:
    # Get public tenant
    client = Client.objects.get(schema_name='public')
    
    # Set schema
    connection.set_schema('public')
    
    print("[INFO] Setting schema to public...")
    
    # Delete all migration records for tenant apps
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM django_migrations WHERE app IN ('course', 'enrollment', 'exam', 'cart', 'core', 'iraq_form');")
        print("[INFO] Deleted migration records")
    
    # Use migrate_schemas with run_syncdb
    print("[INFO] Running migrate_schemas with run_syncdb...")
    call_command('migrate_schemas', schema='public', run_syncdb=True, verbosity=2)
    
    # Verify
    with connection.cursor() as cursor:
        cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_course';")
        result = cursor.fetchone()
        if result:
            print(f"[OK] course_course table exists!")
        else:
            print("[ERROR] course_course table still missing!")
            
except Exception as e:
    print(f"[ERROR] Error: {e}")
    import traceback
    traceback.print_exc()
