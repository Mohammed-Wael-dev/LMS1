#!/usr/bin/env python
"""Create tables for tenant apps in public schema"""
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

from django_tenants.utils import schema_context
from tenant.models import Client
from django.core.management import call_command

try:
    # Get or create public tenant
    client, created = Client.objects.get_or_create(
        schema_name='public',
        defaults={
            'name': 'public',
            'paid_until': '2099-12-31',
            'on_trial': False
        }
    )
    
    if created:
        print("[INFO] Created public tenant")
    else:
        print("[INFO] Public tenant already exists")
    
    # Set tenant schema
    from django.db import connection
    connection.set_schema(client.schema_name)
    
    print("[INFO] Running migrations in public schema...")
    
    # Delete fake migration records first
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM django_migrations WHERE app IN ('course', 'enrollment', 'exam', 'cart', 'core', 'iraq_form');")
        print("[INFO] Deleted fake migration records")
    
    # Run migrations
    call_command('migrate', verbosity=2, run_syncdb=True)
    print("[INFO] Migrations completed!")
    
    # Verify tables were created
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename LIKE 'course%'
            ORDER BY tablename;
        """)
        tables = cursor.fetchall()
        if tables:
            print(f"[OK] Found {len(tables)} course tables:")
            for table in tables:
                print(f"  - {table[0]}")
        else:
            print("[WARNING] No course tables found!")
            # Try to create tables using syncdb
            print("[INFO] Attempting to create tables using syncdb...")
            call_command('migrate', verbosity=2, run_syncdb=True, interactive=False)
    
    print("\n[OK] Done!")
    
except Exception as e:
    print(f"[ERROR] Error: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
