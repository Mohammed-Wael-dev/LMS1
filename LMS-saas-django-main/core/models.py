from django.db import models
from django_ckeditor_5.fields import CKEditor5Field
from shared.app_choices import AppChoices

class WebView(models.Model):
    key = models.CharField(max_length=50, unique=True, choices=AppChoices.WEBVIEW_CHOICES)
    content_ar = CKEditor5Field('Content ar', config_name='extends', blank=True, null=True)
    content_en = CKEditor5Field('Content en', config_name='extends', blank=True, null=True)

    def __str__(self):
        return self.key

    class Meta:
        ordering = ('-id',)
        verbose_name = "Web View"
        verbose_name_plural = "Web Views"
