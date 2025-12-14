#!/usr/bin/env python
"""Create course_course table directly using SQL"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from django.db import connection
from tenant.models import Client

try:
    client = Client.objects.get(schema_name='public')
    connection.set_schema('public')
    
    print("[INFO] Creating course_course table directly...")
    
    # Create course_course table SQL
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS course_course (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        picture VARCHAR(100),
        title VARCHAR(255) UNIQUE NOT NULL,
        slug VARCHAR(220) UNIQUE,
        subtitle VARCHAR(500),
        description TEXT,
        price NUMERIC(8, 2),
        old_price NUMERIC(8, 2) DEFAULT 0.00,
        is_paid BOOLEAN DEFAULT FALSE,
        has_certificate BOOLEAN DEFAULT FALSE,
        level VARCHAR(20) DEFAULT 'beginner',
        is_published BOOLEAN DEFAULT FALSE,
        is_sequential BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        language VARCHAR(20) DEFAULT 'ar',
        search_vector tsvector,
        duration NUMERIC(5, 2),
        instructor_id UUID NOT NULL REFERENCES account_user(id) ON DELETE CASCADE,
        sub_category_id UUID REFERENCES course_subcategory(id) ON DELETE SET NULL
    );
    """
    
    with connection.cursor() as cursor:
        cursor.execute(create_table_sql)
        print("[OK] course_course table created!")
        
        # Verify
        cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_course';")
        result = cursor.fetchone()
        if result:
            print("[OK] Verified: course_course table exists!")
        else:
            print("[ERROR] Table creation failed!")
            
except Exception as e:
    print(f"[ERROR] Error: {e}")
    import traceback
    traceback.print_exc()
