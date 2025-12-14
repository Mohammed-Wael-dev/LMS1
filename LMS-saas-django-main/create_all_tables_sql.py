#!/usr/bin/env python
"""Create all tenant tables using Django's SQL generation"""
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
    client = Client.objects.get(schema_name='public')
    
    # Use tenant context
    from django_tenants.utils import schema_context
    
    with schema_context('public'):
        print("[INFO] Using tenant context for public schema")
        
        # Delete migration records
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM django_migrations WHERE app IN ('course', 'enrollment', 'exam', 'cart', 'core', 'iraq_form');")
            print("[INFO] Deleted migration records")
        
        # Run migrate_schemas for this specific schema
        print("[INFO] Running migrate_schemas for public schema...")
        call_command('migrate_schemas', schema='public', run_syncdb=True, verbosity=2)
        
        # Verify
        with connection.cursor() as cursor:
            cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_course';")
            result = cursor.fetchone()
            if result:
                print(f"\n[OK] course_course table EXISTS!")
            else:
                print("\n[ERROR] course_course table still MISSING!")
                
                # List all tables to see what was created
                cursor.execute("SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';")
                total = cursor.fetchone()[0]
                print(f"[INFO] Total tables in public schema: {total}")
                
                # Try to get SQL for creating the table
                from course.models import Course
                from django.db import models
                print(f"[INFO] Course model table name: {Course._meta.db_table}")
                print(f"[INFO] Course model fields: {[f.name for f in Course._meta.get_fields()]}")
            
except Exception as e:
    print(f"[ERROR] Error: {e}")
    import traceback
    traceback.print_exc()
