from datetime import timedelta

from django.utils import timezone
from django_tenants.test.cases import TenantTestCase
from rest_framework.test import APIRequestFactory

from .models import Language
from .views import tenant_settings


class ClientLanguageTests(TenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Test Tenant"
        tenant.paid_until = timezone.now().date() + timedelta(days=30)
        tenant.on_trial = False

    def setUp(self):
        super().setUp()
        self.factory = APIRequestFactory()

    def test_default_language_added_to_languages(self):
        language = Language.objects.create(code="ar", name="Arabic")
        self.tenant.default_language = language
        self.tenant.save()
        self.assertIn(language, self.tenant.languages.all())

    def test_can_assign_multiple_languages(self):
        ar = Language.objects.create(code="ar", name="Arabic")
        en = Language.objects.create(code="en", name="English")
        self.tenant.save()
        self.tenant.languages.set([ar, en])
        self.tenant.default_language = en
        self.tenant.save()
        self.assertEqual(self.tenant.languages.count(), 2)
        self.assertEqual(self.tenant.default_language, en)

    def test_settings_api_returns_tenant_configuration(self):
        ar = Language.objects.create(code="ar", name="Arabic")
        en = Language.objects.create(code="en", name="English")
        self.tenant.default_language = en
        self.tenant.save()
        self.tenant.languages.add(ar)
        self.tenant.is_registration_enabled = False
        self.tenant.is_courses_filter_enabled = True
        self.tenant.save()

        request = self.factory.get("/api/settings/")
        request.tenant = self.tenant
        response = tenant_settings(request)

        self.assertEqual(response.status_code, 200)
        payload = response.data["data"]
        self.assertEqual(payload["default_language"], {"code": "en", "name": "English"})
        self.assertEqual(
            {lang["code"] for lang in payload["languages"]},
            {"ar", "en"},
        )
        self.assertFalse(payload["is_registration_enabled"])
        self.assertTrue(payload["is_courses_filter_enabled"])
        self.assertTrue(payload["is_review_enabled"])
        self.assertTrue(payload["is_price_enabled"])
