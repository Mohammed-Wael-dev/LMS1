from datetime import timedelta

from django.utils import timezone
from django_tenants.test.cases import TenantTestCase
from rest_framework.test import APIRequestFactory

from .models import City, VotingCenter
from .serializers import (
    IraqFormSubmissionSerializer,
    IraqObserverApplicationSerializer,
)
from .views import get_governorates, submit_iraq_form, submit_iraq_observer_form


class IraqFormSerializerTests(TenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Test Tenant"
        tenant.paid_until = timezone.now().date() + timedelta(days=30)
        tenant.on_trial = False

    def setUp(self):
        super().setUp()
        self.center = VotingCenter.objects.create(name="Main Center")

    def _payload(self, **overrides):
        payload = {
            "first_name": "Ali",
            "second_name": "Hassan",
            "third_name": "Kareem",
            "gender": "male",
            "age": 25,
            "phone_number": "07901234567",
            "voting_center": str(self.center.id),
        }
        payload.update(overrides)
        return payload

    def test_serializer_accepts_valid_payload(self):
        serializer = IraqFormSubmissionSerializer(data=self._payload())
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()
        self.assertEqual(instance.phone_number, "07901234567")
        self.assertEqual(instance.voting_center, self.center)

    def test_serializer_rejects_invalid_phone(self):
        serializer = IraqFormSubmissionSerializer(
            data=self._payload(phone_number="06123456789")
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("phone_number", serializer.errors)

    def test_submit_view_returns_success(self):
        factory = APIRequestFactory()
        request = factory.post(
            "/api/iraq-form/submissions/",
            self._payload(first_name="  Sara  "),
            format="json",
        )
        response = submit_iraq_form(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["first_name"], "Sara")


class IraqObserverApplicationSerializerTests(TenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Test Tenant"
        tenant.paid_until = timezone.now().date() + timedelta(days=30)
        tenant.on_trial = False

    def setUp(self):
        super().setUp()
        self.city = City.objects.create(name="Baghdad")

    def _payload(self, **overrides):
        payload = {
            "full_name": "  Ahmed Ali  ",
            "governorate": str(self.city.id),
            "district": "Karkh",
            "residential_area": "Al Mansour",
            "nearest_voting_center": "Center 1",
            "phone_number": "07901234567",
            "voter_card_number": " 123456789012 ",
            "has_previous_shams_participation": "yes",
            "previous_training_topics": " Observing ",
            "experience_level": "excellent",
            "political_neutrality_confirmation": "yes",
            "attendance_commitment_confirmation": "نعم",
        }
        payload.update(overrides)
        return payload

    def test_serializer_accepts_valid_payload(self):
        serializer = IraqObserverApplicationSerializer(data=self._payload())
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()
        self.assertEqual(instance.full_name, "Ahmed Ali")
        self.assertEqual(instance.governorate, self.city)
        self.assertEqual(instance.previous_training_topics, "Observing")
        self.assertTrue(instance.political_neutrality_confirmation)
        self.assertTrue(instance.attendance_commitment_confirmation)

    def test_serializer_rejects_invalid_phone(self):
        serializer = IraqObserverApplicationSerializer(
            data=self._payload(phone_number="06123456789")
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("phone_number", serializer.errors)

    def test_boolean_fields_accept_no_value(self):
        serializer = IraqObserverApplicationSerializer(
            data=self._payload(
                has_previous_shams_participation="no",
                political_neutrality_confirmation="no",
                attendance_commitment_confirmation="no",
            )
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()
        self.assertFalse(instance.has_previous_shams_participation)
        self.assertFalse(instance.political_neutrality_confirmation)
        self.assertFalse(instance.attendance_commitment_confirmation)

    def test_submit_view_returns_success(self):
        factory = APIRequestFactory()
        request = factory.post(
            "/api/iraq-form/observer-applications/",
            self._payload(),
            format="json",
        )
        response = submit_iraq_observer_form(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["full_name"], "Ahmed Ali")
        self.assertEqual(response.data["data"]["governorate"], str(self.city.id))
        self.assertEqual(
            response.data["data"]["governorate_detail"]["name"],
            "Baghdad",
        )

    def test_get_governorates_returns_active_city(self):
        City.objects.create(name="Basra", is_active=False)
        factory = APIRequestFactory()
        request = factory.get("/api/iraq-form/governorates/")
        response = get_governorates(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["data"]), 1)
        self.assertEqual(response.data["data"][0]["name"], "Baghdad")
