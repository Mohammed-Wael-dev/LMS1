from django.contrib import admin
from django.db.models import Count
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.db import models
from django.forms import TextInput, Textarea
from django.utils import timezone
from datetime import timedelta

from .models import City, IraqFormSubmission, IraqObserverApplication, VotingCenter, IraqFormAnalytics

@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("name",)

@admin.register(VotingCenter)
class VotingCenterAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("name",)

@admin.register(IraqFormSubmission)
class IraqFormSubmissionAdmin(admin.ModelAdmin):
    list_display = (
        "first_name",
        "second_name",
        "third_name",
        "gender",
        "age",
        "phone_number",
        "source",
        "voting_center",
        "created_at",
    )
    list_filter = ("gender", "source")
    search_fields = (
        "first_name",
        "second_name",
        "third_name",
        "phone_number",
        "source",
    )

@admin.register(IraqObserverApplication)
class IraqObserverApplicationAdmin(admin.ModelAdmin):
    list_display = (
        "full_name",
        "city",
        "district",
        "phone_number",
        "experience_level",
        "has_previous_shams_participation",
        "created_at",
    )
    list_filter = (
        "experience_level",
        "city",
        "has_previous_shams_participation",
        "political_neutrality_confirmation",
        "attendance_commitment_confirmation",
    )
    search_fields = (
        "full_name",
        "governorate__name",
        "district",
        "residential_area",
        "phone_number",
        "voter_card_number",
    )


@admin.register(IraqFormAnalytics)
class IraqFormAnalyticsAdmin(admin.ModelAdmin):
    list_display = ("ip_address", "action_type", "created_at")
    list_filter = ("action_type", "created_at")
    search_fields = ("ip_address",)
    readonly_fields = ("ip_address", "action_type", "created_at")
    date_hierarchy = "created_at"
    ordering = ["-created_at"]
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
    
    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        
        # إحصائيات بسيطة
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        # عدد الزوار الفريدين (IP addresses)
        unique_visitors_today = IraqFormAnalytics.objects.filter(
            action_type='page_visit', 
            created_at__date=today
        ).values('ip_address').distinct().count()
        
        unique_visitors_week = IraqFormAnalytics.objects.filter(
            action_type='page_visit', 
            created_at__date__gte=week_ago
        ).values('ip_address').distinct().count()
        
        unique_visitors_month = IraqFormAnalytics.objects.filter(
            action_type='page_visit', 
            created_at__date__gte=month_ago
        ).values('ip_address').distinct().count()
        
        # عدد مقدمي النماذج
        form_submissions_today = IraqFormAnalytics.objects.filter(
            action_type='form_submission', 
            created_at__date=today
        ).count()
        
        form_submissions_week = IraqFormAnalytics.objects.filter(
            action_type='form_submission', 
            created_at__date__gte=week_ago
        ).count()
        
        form_submissions_month = IraqFormAnalytics.objects.filter(
            action_type='form_submission', 
            created_at__date__gte=month_ago
        ).count()
        
        # معدل التحويل
        conversion_rate_today = 0
        if unique_visitors_today > 0:
            conversion_rate_today = (form_submissions_today / unique_visitors_today) * 100
        
        conversion_rate_week = 0
        if unique_visitors_week > 0:
            conversion_rate_week = (form_submissions_week / unique_visitors_week) * 100
        
        conversion_rate_month = 0
        if unique_visitors_month > 0:
            conversion_rate_month = (form_submissions_month / unique_visitors_month) * 100
        
        extra_context.update({
            'analytics': {
                'unique_visitors': {
                    'today': unique_visitors_today,
                    'week': unique_visitors_week,
                    'month': unique_visitors_month,
                },
                'form_submissions': {
                    'today': form_submissions_today,
                    'week': form_submissions_week,
                    'month': form_submissions_month,
                },
                'conversion_rates': {
                    'today': round(conversion_rate_today, 2),
                    'week': round(conversion_rate_week, 2),
                    'month': round(conversion_rate_month, 2),
                },
            }
        })
        
        return super().changelist_view(request, extra_context)
