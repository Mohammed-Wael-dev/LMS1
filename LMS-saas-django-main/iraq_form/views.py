import logging

import requests
from django.conf import settings
from django.utils import timezone
from django.shortcuts import render
from django.db.models import Count, Q
from django.db.models.functions import TruncDate, TruncHour
from datetime import datetime, timedelta
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from shared.utilts import MyResponse

from .models import City, VotingCenter, IraqFormAnalytics
from .serializers import (
    CitySerializer,
    IraqFormSubmissionSerializer,
    IraqObserverApplicationSerializer,
    VotingCenterSerializer,
)

logger = logging.getLogger(__name__)

RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"


def get_client_ip(request):
    """استخراج IP address من الطلب"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def track_analytics(request, action_type, source=None):
    try:
        ip_address = get_client_ip(request)
        
        if source is None:
            source = request.GET.get('source') or request.data.get('source')
            if not source:
                source = None
     
        
        if action_type == 'page_visit':
            today = timezone.now().date()
            existing_visit = IraqFormAnalytics.objects.filter(
                ip_address=ip_address,
                action_type='page_visit',
                source=source,
                created_at__date=today
            ).exists()
            
            if not existing_visit:
                IraqFormAnalytics.objects.create(
                    ip_address=ip_address,
                    action_type=action_type,
                    source=source
                )
        else:
            IraqFormAnalytics.objects.create(
                ip_address=ip_address,
                action_type=action_type,
                source=source
            )
    except Exception as e:
        logger.error(f"Error tracking analytics: {e}")


def _verify_recaptcha(request):
    token = (
        request.data.get("recaptcha_token")
        or request.data.get("g-recaptcha-response")
        or request.data.get("recaptcha")
        or request.data.get("captcha_token")
        or request.data.get("captcha")
        or request.data.get("recaptchaToken")
    )
    if not token:
        return False, "reCAPTCHA token is required.", status.HTTP_400_BAD_REQUEST

    secret_key = getattr(settings, "GOOGLE_RECAPTCHA_SECRET_KEY", "")
    if not secret_key:
        logger.error("GOOGLE_RECAPTCHA_SECRET_KEY is not configured.")
        return (
            False,
            "reCAPTCHA verification is temporarily unavailable.",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    data = {"secret": secret_key, "response": token}

    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        data["remoteip"] = x_forwarded_for.split(",")[0].strip()
    else:
        remote_addr = request.META.get("REMOTE_ADDR")
        if remote_addr:
            data["remoteip"] = remote_addr

    try:
        response = requests.post(RECAPTCHA_VERIFY_URL, data=data, timeout=5)
        response.raise_for_status()
        result = response.json()
    except requests.RequestException:
        logger.exception("Error verifying Google reCAPTCHA.")
        return (
            False,
            "Unable to verify reCAPTCHA. Please try again later.",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if not result.get("success"):
        logger.info("reCAPTCHA verification failed: %s", result.get("error-codes"))
        return (
            False,
            "reCAPTCHA verification failed. Please try again.",
            status.HTTP_400_BAD_REQUEST,
        )

    return True, None, None


@api_view(["GET"])
@permission_classes([AllowAny])
def get_governorates(request):
    cities = City.objects.filter(is_active=True).order_by("name")
    serializer = CitySerializer(cities, many=True)
    return MyResponse({"data": serializer.data})


@api_view(["GET"])
@permission_classes([AllowAny])
def get_voting_centers(request):
    centers = VotingCenter.objects.filter(is_active=True).order_by("name")
    serializer = VotingCenterSerializer(centers, many=True)
    return MyResponse({"data": serializer.data})


@api_view(["POST"])
@permission_classes([AllowAny])
def submit_iraq_form(request):
    serializer = IraqFormSubmissionSerializer(data=request.data)
    if serializer.is_valid():
        submission = serializer.save()
        source = request.data.get('source') or request.GET.get('source')
        track_analytics(request, 'form_submission', source)
        return MyResponse({"data": serializer.data})
    return MyResponse({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

@api_view(["POST"])
@permission_classes([AllowAny])
def submit_iraq_observer_form(request):
    serializer = IraqObserverApplicationSerializer(data=request.data)
    if serializer.is_valid():
        submission = serializer.save()
        return MyResponse({"data": serializer.data})
    return MyResponse({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([AllowAny])
def track_page_visit(request):
    track_analytics(request, 'page_visit')
    return MyResponse({"message": "تم تسجيل الزيارة بنجاح"})


def analytics_dashboard(request):
    """صفحة عرض إحصائيات فورم العراق مع فلاتر متقدمة"""
    
    # الحصول على المعاملات من URL
    date_from = request.GET.get('date_from')
    date_to = request.GET.get('date_to')
    action_type = request.GET.get('action_type', '')
    ip_address = request.GET.get('ip_address', '')
    source = request.GET.get('source', '')
    
    # بناء الاستعلام الأساسي
    queryset = IraqFormAnalytics.objects.all()
    
    # تطبيق الفلاتر
    if date_from:
        try:
            date_from_obj = datetime.strptime(date_from, '%Y-%m-%d').date()
            queryset = queryset.filter(created_at__date__gte=date_from_obj)
        except ValueError:
            pass
    
    if date_to:
        try:
            date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').date()
            queryset = queryset.filter(created_at__date__lte=date_to_obj)
        except ValueError:
            pass
    
    if action_type:
        queryset = queryset.filter(action_type=action_type)
    
    if ip_address:
        queryset = queryset.filter(ip_address__icontains=ip_address)
    
    if source:
        queryset = queryset.filter(source=source)
    
    # إحصائيات عامة
    total_records = queryset.count()
    total_page_visits = queryset.filter(action_type='page_visit').count()
    total_form_submissions = queryset.filter(action_type='form_submission').count()
    unique_ips = queryset.values('ip_address').distinct().count()
    
    # إحصائيات اليوم
    today = timezone.now().date()
    today_visits = queryset.filter(
        action_type='page_visit',
        created_at__date=today
    ).count()
    today_submissions = queryset.filter(
        action_type='form_submission',
        created_at__date=today
    ).count()
    
    # إحصائيات آخر 7 أيام
    week_ago = today - timedelta(days=7)
    week_visits = queryset.filter(
        action_type='page_visit',
        created_at__date__gte=week_ago
    ).count()
    week_submissions = queryset.filter(
        action_type='form_submission',
        created_at__date__gte=week_ago
    ).count()
    
    # إحصائيات آخر 30 يوم
    month_ago = today - timedelta(days=30)
    month_visits = queryset.filter(
        action_type='page_visit',
        created_at__date__gte=month_ago
    ).count()
    month_submissions = queryset.filter(
        action_type='form_submission',
        created_at__date__gte=month_ago
    ).count()
    
    
    # أكثر IP addresses نشاطاً
    top_ips = queryset.values('ip_address').annotate(
        total_actions=Count('id'),
        visits=Count('id', filter=Q(action_type='page_visit')),
        submissions=Count('id', filter=Q(action_type='form_submission'))
    ).order_by('-total_actions')[:10]
    
    # إحصائيات حسب المصدر
    source_stats = queryset.values('source').annotate(
        count=Count('id')
    ).order_by('-count')
    
    # إحصائيات مفصلة حسب المصدر ونوع العملية
    source_action_stats = queryset.values('source', 'action_type').annotate(
        count=Count('id')
    ).order_by('source', 'action_type')
    
    context = {
        'total_records': total_records,
        'total_page_visits': total_page_visits,
        'total_form_submissions': total_form_submissions,
        'unique_ips': unique_ips,
        'today_visits': today_visits,
        'today_submissions': today_submissions,
        'week_visits': week_visits,
        'week_submissions': week_submissions,
        'month_visits': month_visits,
        'month_submissions': month_submissions,
        'top_ips': list(top_ips),
        'source_stats': list(source_stats),
        'source_action_stats': list(source_action_stats),
        'filters': {
            'date_from': date_from,
            'date_to': date_to,
            'action_type': action_type,
            'ip_address': ip_address,
            'source': source,
        },
        'action_choices': [
            ('', 'جميع الأنواع'),
            ('page_visit', 'زيارة الصفحة'),
            ('form_submission', 'تقديم النموذج'),
        ],
        'source_choices': [
            ('', 'جميع المصادر'),
            ('facebook', 'فيسبوك'),
            ('wa', 'واتساب'),
            ('', 'غير محدد'),
        ]
    }
    
    return render(request, 'iraq_form/analytics_dashboard.html', context)
