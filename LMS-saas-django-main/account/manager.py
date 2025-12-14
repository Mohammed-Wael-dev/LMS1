from django.contrib.auth.models import  BaseUserManager
from django.db import models
from django.db.models import Count, Q, Avg, Sum ,F, FloatField, ExpressionWrapper, Count, Q, Case, When, Value
from django.utils import timezone
from django.db.models.functions import Round , JSONObject


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class StudentManager(models.QuerySet):
    def get_info_courses(self):
        today = timezone.now()
        start_month = today.replace(day=1)
        
        return self.annotate(
            # courses_completed - عدد الدورات المكتملة (بناءً على الشهادات)
            courses_completed=Count("certificates", distinct=True),
            
            # enrolled_courses - عدد الدورات المسجل فيها الطالب
            enrolled_courses=Count("student_enrollments__course", distinct=True),
            
            # certificates_earned - عدد الشهادات المكتسبة
            certificates_earned=Count("certificates", distinct=True),
            
            # new_courses_this_month - عدد الدورات المكتملة هذا الشهر
            new_courses_this_month=Count(
                "certificates",
                filter=Q(certificates__date_issued__gte=start_month),
                distinct=True,
            ),
            
            # overall_progress - متوسط تقدم الطالب في جميع الدورات (نسبة الدروس المكتملة)
            total_lessons_in_enrolled_courses=Count(
                "student_enrollments__course__sections__lessons",
                distinct=True
            ),
            lessons_watched=Count(
                "progress_user",
                filter=Q(progress_user__watched=True),
                distinct=True
            ),
            overall_progress=Case(
                When(
                    total_lessons_in_enrolled_courses__gt=0, 
                    then=Round(
                        ExpressionWrapper(
                            100 * F("lessons_watched") / F("total_lessons_in_enrolled_courses"),
                            output_field=FloatField()
                        ),
                        2
                    )
                ),
                default=0,
                output_field=FloatField()
            )
        ) 
        
class InstructorManager(models.QuerySet):
    def get_info_courses(self):
        today = timezone.now()
        start_month = today.replace(day=1)
        return self.annotate(
            new_reviews=Count(
                "instructor_courses__reviews",
                filter=Q(instructor_courses__reviews__created_at__gt=start_month),
                distinct=True
            ), 
            new_students=Count(
                "instructor_courses__enrollments",
                filter=Q(instructor_courses__enrollments__date_enrolled__gt=start_month),
                distinct=True
            ), 
            revenue_this_month=Sum(
                "instructor_courses__enrollments__course__price",
                filter=Q(instructor_courses__enrollments__date_enrolled__gt=start_month),
                distinct=True
            ),
        ).get_instructor_info_courses()

    def get_instructor_info_courses(self):
        return self.annotate(
            total_reviews=Count("instructor_courses__reviews", distinct=True),
            total_courses=Count("instructor_courses", distinct=True),
            total_students=Count("instructor_courses__enrollments"),
            average_rating=Avg("instructor_courses__reviews__rating", distinct=True),
            revenue=Sum("instructor_courses__enrollments__course__price", distinct=True)
        )