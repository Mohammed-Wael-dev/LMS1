#!/usr/bin/env python
"""Final fix: Create all tenant tables"""
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
    print("[INFO] Getting public tenant...")
    client = Client.objects.get(schema_name='public')
    
    print("[INFO] Setting schema to public...")
    connection.set_schema('public')
    
    # Delete ALL migration records for tenant apps
    print("[INFO] Deleting all migration records for tenant apps...")
    with connection.cursor() as cursor:
        cursor.execute("""
            DELETE FROM django_migrations 
            WHERE app IN ('course', 'enrollment', 'exam', 'cart', 'core', 'iraq_form');
        """)
        deleted = cursor.rowcount
        print(f"[INFO] Deleted {deleted} migration records")
    
    # Now run migrations - they should create tables
    print("[INFO] Running migrations with run_syncdb...")
    call_command('migrate', run_syncdb=True, verbosity=2, interactive=False)
    
    # Verify course_course table
    print("\n[INFO] Verifying tables...")
    with connection.cursor() as cursor:
        # Check course_course
        cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_course';")
        result = cursor.fetchone()
        if result:
            print(f"[OK] course_course table EXISTS!")
        else:
            print("[ERROR] course_course table MISSING!")
        
        # List all course tables
        cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'course%' ORDER BY tablename;")
        course_tables = cursor.fetchall()
        print(f"[INFO] Course tables found: {len(course_tables)}")
        for table in course_tables:
            print(f"  - {table[0]}")
        
        # List all tenant app tables
        cursor.execute("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            AND (tablename LIKE 'course%' OR tablename LIKE 'enrollment%' OR tablename LIKE 'exam%' OR tablename LIKE 'cart%' OR tablename LIKE 'core%')
            ORDER BY tablename;
        """)
        all_tenant_tables = cursor.fetchall()
        print(f"\n[INFO] Total tenant app tables: {len(all_tenant_tables)}")
        for table in all_tenant_tables[:20]:
            print(f"  - {table[0]}")
            
except Exception as e:
    print(f"[ERROR] Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
