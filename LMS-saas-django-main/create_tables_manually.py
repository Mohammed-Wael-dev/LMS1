#!/usr/bin/env python
"""Manually create tables for tenant apps"""
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

from django.db import connection
from django.core.management import call_command
from django_tenants.utils import schema_context
from tenant.models import Client

print("Setting schema to public...")
# Ensure we're using the public tenant
try:
    client = Client.objects.get(schema_name='public')
    connection.set_tenant(client)
    print(f"Using tenant: {client.name} (schema: {client.schema_name})")
except Client.DoesNotExist:
    print("WARNING: Public tenant not found, using public schema directly")
    connection.set_schema('public')

print("Running migrations...")
try:
    # First delete fake migration records
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM django_migrations WHERE app IN ('course', 'enrollment', 'exam', 'cart', 'core', 'iraq_form');")
        print("Deleted fake migration records")
    
    # Use migrate_schemas command instead
    call_command('migrate_schemas', schema='public', run_syncdb=True, verbosity=2)
    print("\n[OK] Migrations completed!")
    
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
            print(f"\n[OK] Found {len(tables)} course tables:")
            for table in tables:
                print(f"  - {table[0]}")
        else:
            print("\n[WARNING] No course tables found!")
            
except Exception as e:
    print(f"\n[ERROR] Error: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
