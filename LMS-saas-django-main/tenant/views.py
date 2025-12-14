from django.db import connection
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from shared.utilts import MyResponse

from .serializers import TenantSettingsSerializer

@api_view(["GET"])
@permission_classes([AllowAny])
def tenant_settings(request):
    tenant = getattr(request, 'tenant', None)
    if tenant is None:
        # Return default settings when no tenant is found (public schema)
        from tenant.models import Client
        try:
            # Try to get the public tenant
            tenant = Client.objects.filter(schema_name='public').first()
            if tenant is None:
                # Return default settings
                default_settings = {
                    "is_review_enabled": True,
                    "is_price_enabled": True,
                    "languages": [],
                    "default_language": None,
                    "is_registration_enabled": True,
                    "is_courses_filter_enabled": True,
                    "is_Q_and_A_enabled": True,
                    "is_chat_group_enabled": True,
                    "is_lesson_notes_enabled": True,
                    "index_page": "home",
                    "logo_file": None,
                    "logo_text": None,
                    "logo_type": "logo",
                    "login_type": "email"
                }
                return MyResponse({"data": default_settings})
        except Exception:
            # Return default settings on any error
            default_settings = {
                "is_review_enabled": True,
                "is_price_enabled": True,
                "languages": [],
                "default_language": None,
                "is_registration_enabled": True,
                "is_courses_filter_enabled": True,
                "is_Q_and_A_enabled": True,
                "is_chat_group_enabled": True,
                "is_lesson_notes_enabled": True,
                "index_page": "home",
                "logo_file": None,
                "logo_text": None,
                "logo_type": "logo",
                "login_type": "email"
            }
            return MyResponse({"data": default_settings})

    serializer = TenantSettingsSerializer(tenant)
    return MyResponse({"data": serializer.data})



## For creating superuser
## python3 manage.py tenant_command createsuperuser --schema smart-sense-demo
## python3 manage.py tenant_command createsuperuser --schema vision-test
## python3 manage.py tenant_command createsuperuser --schema iraq-election
## python3 manage.py tenant_command createsuperuser --schema ollms-fossa-kanaan
