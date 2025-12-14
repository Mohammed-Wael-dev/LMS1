from django.db import models
from django_tenants.models import TenantMixin, DomainMixin


class Language(models.Model):
    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=100)

    class Meta:
        ordering = ['name']

    def __str__(self):  # pragma: no cover
        return self.name


class Client(TenantMixin):
    name = models.CharField(max_length=100)
    paid_until = models.DateField(null=True, blank=True)

    on_trial = models.BooleanField(default=True)
    languages = models.ManyToManyField('Language', blank=True, related_name='clients')
    default_language = models.ForeignKey('Language',null=True,blank=True,on_delete=models.SET_NULL,related_name='default_for_clients',)
    is_registration_enabled = models.BooleanField(default=True)
    is_courses_filter_enabled = models.BooleanField(default=True)
    is_review_enabled = models.BooleanField(default=True)
    is_price_enabled = models.BooleanField(default=True)
    is_Q_and_A_enabled = models.BooleanField(default=True)
    is_chat_group_enabled = models.BooleanField(default=True)
    is_lesson_notes_enabled = models.BooleanField(default=True)
    index_page = models.CharField(max_length=255, choices=[("home","home"),("login","login"),("courses","courses")],default="home")
    logo_type = models.CharField(max_length=50, choices=[("logo","logo"),("text","text")], default="logo")
    logo_text = models.CharField(max_length=100,null=True, blank=True)
    logo_file = models.FileField(null=True, blank=True)
    login_type = models.CharField(max_length=50, choices=[("phone","phone"),("email","email")], default="email")
    is_password_login_enabled = models.BooleanField(default=True)

    auto_create_schema = True

    def save(self, *args, **kwargs):
        default_language = self.default_language
        super().save(*args, **kwargs)
        if default_language:
            self.languages.add(default_language)


class Domain(DomainMixin):
    pass

