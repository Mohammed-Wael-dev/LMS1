from django.urls import path

from .views import tenant_settings

urlpatterns = [
    path('settings/', tenant_settings, name='tenant-settings'),
]
