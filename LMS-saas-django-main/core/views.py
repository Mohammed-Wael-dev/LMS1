from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import WebView
from shared.app_utils import AppUtils
from account.models import User
from course.models import Course
from enrollment.models import Certificate, StudentReview, Enrollment
from .serializers import SimpleReviewSerializer

@api_view(['GET'])
def webview(request):
    key = request.GET.get('key')

    if not key:
        return AppUtils.response(error="Key parameter is required")
    
    data = get_object_or_404(WebView, key=key)
    accept_language = request.META.get('HTTP_ACCEPT_LANGUAGE', 'en')
    if 'ar' in accept_language.lower():
        content = data.content_ar
    else:
        content = data.content_en

    return AppUtils.response(data=content)

@api_view(['GET'])
def dashboard_stats(request):
    try:
        total_students = User.objects.filter(is_student=True).count()
        total_instructors = User.objects.filter(is_instructor=True).count()
        total_courses = Course.objects.count()
        registered_students = User.objects.filter(
            is_student=True,
            student_enrollments__isnull=False
        ).distinct().count()
        certificates_issued = Certificate.objects.count()
        
        # Calculate success rate: (completed courses / total enrollments) * 100
        total_enrollments = Enrollment.objects.count()
        if total_enrollments > 0:
            success_rate = round((certificates_issued / total_enrollments) * 100, 2)
        else:
            success_rate = 0
        
        stats_data = {
            'total_students': total_students,
            'total_instructors': total_instructors,
            'total_courses': total_courses,
            'registered_students': registered_students,
            'certificates_issued': certificates_issued,
            'success_rate': success_rate
        }
        
        return AppUtils.response(data=stats_data)
        
    except Exception as e:
        return AppUtils.response(error=f"Error in getting dashboard stats: {str(e)}")

@api_view(['GET'])
def top_reviews(request):
    try:
        top_reviews = StudentReview.objects.filter(
            comment__isnull=False,
            comment__gt='' 
        ).exclude(
            comment__exact='' 
        ).order_by('-rating', '-created_at')[:3]
        
        serializer = SimpleReviewSerializer(top_reviews, many=True, context={'request': request})
        
        return AppUtils.response(data=serializer.data)
    except Exception as e:
        return AppUtils.response(error=f"Error in getting top reviews: {str(e)}")


@api_view(['GET'])
def settings(request):
    """
    Return default settings when tenant system is disabled
    """
    default_settings = {
        "is_review_enabled": True,
        "is_price_enabled": True,
        "is_registration_enabled": True,
        "is_courses_filter_enabled": True,
        "is_Q_and_A_enabled": True,
        "is_chat_group_enabled": True,
        "is_lesson_notes_enabled": True,
        "index_page": "home",
        "logo_type": "text",
        "logo_text": "LMS",
        "logo_file": None,
        "login_type": "email",
        "languages": [
            {"code": "ar", "name": "العربية"},
            {"code": "en", "name": "English"}
        ],
        "default_language": {"code": "ar", "name": "العربية"},
        "student_timer": 20
    }
    return AppUtils.response(data=default_settings)


