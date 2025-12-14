from django.contrib import admin
from .models import (
    User,
    Student,
    Instructor,
    TokensVerfication,
    AssessmentQuestion,
    UserAssessment,
)

# ======================================================
# User Admin
# ======================================================
@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = (
        "email",
        "first_name",
        "last_name",
        "is_student",
        "is_instructor",
        "is_staff",
        "is_active",
        "has_completed_assessment",
        "assessment_level",
    )
    search_fields = ("email", "first_name", "last_name")
    list_filter = ("is_student", "is_instructor", "is_active")


# ======================================================
# Student Admin
# ======================================================
@admin.register(Student)
class StudentAdmin(UserAdmin):
    ordering = ("email",)


# ======================================================
# Instructor Admin
# ======================================================
@admin.register(Instructor)
class InstructorAdmin(UserAdmin):
    ordering = ("email",)


# ======================================================
# Tokens Verification Admin
# ======================================================
@admin.register(TokensVerfication)
class TokensVerficationAdmin(admin.ModelAdmin):
    list_display = ("user", "token", "token_type", "expire_date")
    list_filter = ("token_type",)


# ======================================================
# Assessment Question Admin (✔ متوافق مع Gemini)
# ======================================================
@admin.register(AssessmentQuestion)
class AssessmentQuestionAdmin(admin.ModelAdmin):
    list_display = (
        'text',
        'level_weight',
        'order',
        'is_active',
        'correct_answer_key',
        'created_at',
    )

    list_filter = ('level_weight', 'is_active')
    search_fields = ('text', 'option_a', 'option_b', 'option_c', 'option_d')
    ordering = ('order',)
    list_editable = ('order', 'is_active')

    fieldsets = (
        ('Question', {
            'fields': ('text', 'level_weight', 'order', 'is_active')
        }),
        ('Options', {
            'fields': ('option_a', 'option_b', 'option_c', 'option_d')
        }),
        ('Correct Answer', {
            'fields': ('correct_answer_key',)
        }),
        ('Meta', {
            'fields': ('created_at',)
        }),
    )

    readonly_fields = ('created_at',)



# ======================================================
# User Assessment Admin
# ======================================================
@admin.register(UserAssessment)
class UserAssessmentAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "question",
        "selected_answer",
        "is_correct",
        "created_at",
    )

    list_filter = ("is_correct", "created_at")
    search_fields = ("user__email",)
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
