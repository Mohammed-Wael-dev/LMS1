from django.contrib import admin
from .models import *

class WebViewAdmin(admin.ModelAdmin):
    list_display = ('key',)
    
admin.site.register(WebView, WebViewAdmin)