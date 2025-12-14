#!/usr/bin/env python
"""Create default tenant for local development"""
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

from tenant.models import Client, Domain

try:
    # Check if tenant already exists
    tenant_name = 'public'
    domain_name = 'localhost'
    
    if Client.objects.filter(schema_name='public').exists():
        client = Client.objects.get(schema_name='public')
        print('[OK] Tenant already exists!')
    else:
        # Create tenant
        client = Client(
            schema_name='public',
            name=tenant_name,
            paid_until='2099-12-31',
            on_trial=False
        )
        client.save()
        print('[OK] Tenant created successfully!')
    
    # Check if domain exists
    if Domain.objects.filter(domain=domain_name).exists():
        domain = Domain.objects.get(domain=domain_name)
        print('[OK] Domain already exists!')
    else:
        # Create domain
        domain = Domain()
        domain.domain = domain_name
        domain.tenant = client
        domain.is_primary = True
        domain.save()
        print('[OK] Domain created successfully!')
    
    print(f'\nTenant: {client.name} (schema: {client.schema_name})')
    print(f'Domain: {domain.domain} (primary: {domain.is_primary})')
    print('\n[OK] Setup complete! You can now access the API.')
    
except Exception as e:
    print(f'[ERROR] Error: {str(e)}')
    import traceback
    traceback.print_exc()
    sys.exit(1)

