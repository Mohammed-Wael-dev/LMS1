from django.db import models
from .manager import UserManager, StudentManager, InstructorManager
import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from datetime import timedelta
from django.utils import timezone
from django.conf import settings


# =====================================================
# User Model
# =====================================================
class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=50, blank=True, null=True)
    last_name = models.CharField(max_length=50, blank=True, null=True)

    is_student = models.BooleanField(default=False)
    is_instructor = models.BooleanField(default=False)

    bio = models.TextField(blank=True, null=True)
    profile_image = models.ImageField(upload_to="profiles/", blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    location = models.CharField(max_length=100, blank=True, null=True)

    date_joined = models.DateTimeField(auto_now_add=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)

    # Assessment result
    has_completed_assessment = models.BooleanField(default=False)
    assessment_level = models.CharField(
        max_length=20,
        choices=[
            ('beginner', 'Beginner'),
            ('intermediate', 'Intermediate'),
            ('advanced', 'Advanced')
        ],
        null=True,
        blank=True
    )
    assessment_advanced_tips = models.JSONField(
        default=None,
        blank=True,
        null=True,
        help_text="نصائح متقدمة من Gemini"
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = UserManager()

    def __str__(self):
        return self.email


# =====================================================
# Proxy Models
# =====================================================
class Student(User):
    objects = StudentManager.as_manager()

    class Meta:
        proxy = True

    def save(self, *args, **kwargs):
        self.is_student = True
        super().save(*args, **kwargs)


class Instructor(User):
    objects = InstructorManager.as_manager()

    class Meta:
        proxy = True

    def save(self, *args, **kwargs):
        self.is_instructor = True
        super().save(*args, **kwargs)


# =====================================================
# Token Verification
# =====================================================
class TokensVerfication(models.Model):
    user = models.ForeignKey(User, related_name="user_tokens", on_delete=models.CASCADE)
    token = models.UUIDField(default=uuid.uuid4)
    expire_date = models.DateTimeField()
    token_type = models.CharField(
        max_length=50,
        choices=[('signup', 'Signup'), ('password_reset', 'Password Reset')]
    )

    def save(self, *args, **kwargs):
        if not self.expire_date:
            self.expire_date = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.email} - {self.token}"

# =====================================================
# Assessment Question (Gemini Compatible)
# =====================================================
class AssessmentQuestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    text = models.TextField()

    option_a = models.CharField(max_length=255)
    option_b = models.CharField(max_length=255)
    option_c = models.CharField(max_length=255)
    option_d = models.CharField(max_length=255)

    correct_answer_key = models.CharField(
        max_length=1,
        choices=[('A', 'A'), ('B', 'B'), ('C', 'C'), ('D', 'D')]
    )

    level_weight = models.CharField(
        max_length=20,
        choices=[
            ('beginner', 'Beginner'),
            ('intermediate', 'Intermediate'),
            ('advanced', 'Advanced')
        ]
    )

    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.text[:50]

    # Compatible with old code
    @property
    def correct_answer(self):
        return self.correct_answer_key

    @property
    def question_text(self):
        return self.text



# =====================================================
# User Answers
# =====================================================
class UserAssessment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="assessment_answers"
    )

    question = models.ForeignKey(
        AssessmentQuestion,
        on_delete=models.CASCADE,
        related_name="answers"
    )

    selected_answer = models.CharField(
        max_length=1,
        choices=[('A', 'A'), ('B', 'B'), ('C', 'C'), ('D', 'D')]
    )

    is_correct = models.BooleanField()
    explanation_ar = models.TextField(blank=True, null=True, help_text="شرح مفصل للإجابة من Gemini")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'question')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - Q{self.question.question_id}"
