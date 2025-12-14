from django.db import models
from shared.models import UUIDMixin


class City(UUIDMixin):
    name = models.CharField(max_length=150, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):  # pragma: no cover
        return self.name


class VotingCenter(UUIDMixin):
    name = models.CharField(max_length=255, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):  # pragma: no cover
        return self.name


class IraqFormSubmission(UUIDMixin):
    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"

    first_name = models.CharField(max_length=150)
    second_name = models.CharField(max_length=150)
    third_name = models.CharField(max_length=150)
    gender = models.CharField(max_length=6, choices=Gender.choices)
    age = models.PositiveSmallIntegerField()
    phone_number = models.CharField(max_length=15)
    source = models.CharField(max_length=255, blank=True, null=True)
    voting_center = models.ForeignKey(
        VotingCenter,
        on_delete=models.PROTECT,
        related_name="submissions",
    )
    polling_center_number = models.PositiveBigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):  # pragma: no cover
        return f"{self.first_name} {self.second_name} {self.third_name}"


class IraqObserverApplication(UUIDMixin):
    class ExperienceLevel(models.TextChoices):
        EXCELLENT = "excellent", "Excellent"
        VERY_GOOD = "very_good", "Very Good"
        GOOD = "good", "Good"
        FAIR = "fair", "Fair"
        WEAK = "weak", "Weak"

    full_name = models.CharField(max_length=255)
    city = models.ForeignKey(City,
        on_delete=models.PROTECT,
        related_name="observer_applications",
    )
    district = models.CharField(max_length=150)
    residential_area = models.CharField(max_length=150)
    nearest_voting_center = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=15)
    voter_card_number = models.CharField(max_length=25)
    has_previous_shams_participation = models.BooleanField()
    previous_training_topics = models.TextField(blank=True)
    experience_level = models.CharField(max_length=20,choices=ExperienceLevel.choices,)
    political_neutrality_confirmation = models.BooleanField()
    attendance_commitment_confirmation = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):  # pragma: no cover
        return self.full_name


class IraqFormAnalytics(UUIDMixin):
    """موديل لتتبع زيارات الصفحة وتقديمات النماذج للعراق"""
    ip_address = models.GenericIPAddressField(verbose_name="عنوان IP")
    action_type = models.CharField(max_length=20, choices=[
        ('page_visit', 'زيارة الصفحة'),
        ('form_submission', 'تقديم النموذج'),
    ], verbose_name="نوع العملية")
    source = models.CharField(max_length=255, blank=True, null=True, verbose_name="المصدر")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإنشاء")
    
    class Meta:
        ordering = ["-created_at"]
        verbose_name = "إحصائيات فورم العراق"
        verbose_name_plural = "إحصائيات فورم العراق"
        indexes = [
            models.Index(fields=['ip_address', 'created_at']),
            models.Index(fields=['action_type', 'created_at']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_action_type_display()} من {self.ip_address} في {self.created_at.strftime('%Y-%m-%d %H:%M')}"