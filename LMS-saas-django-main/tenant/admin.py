from django import forms
from django.contrib import admin
from django_tenants.admin import TenantAdminMixin

from .models import Client, Domain, Language


class ClientAdminForm(forms.ModelForm):
    class Meta:
        model = Client
        fields = '__all__'

    def clean(self):
        cleaned_data = super().clean()
        languages = cleaned_data.get('languages')
        default_language = cleaned_data.get('default_language')
        if default_language and languages is not None and default_language not in languages:
            self.add_error('default_language', 'Default language must be one of the selected languages.')
        return cleaned_data


@admin.register(Client)
class ClientAdmin(TenantAdminMixin, admin.ModelAdmin):
    form = ClientAdminForm
    filter_horizontal = ('languages',)
    list_display = ('name', 'paid_until', 'default_language')


admin.site.register(Domain)
admin.site.register(Language)