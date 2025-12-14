from django.urls import path
from . import views
from enrollment.views import get_certificates

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('phone-login/', views.phone_login_view, name='phone_login'),
    path('register/', views.register_view, name='register'),
    path('verify-account/', views.verfiy_account, name='verify_account'),
    path('refresh-token/', views.refresh_token_view, name='refresh_token'),
    path('update-profile/', views.update_profile_view, name='update_profile'),
    path('get-info-achivements/', views.get_info_achivements_student, name='get_info_achivements'),
    path('get-certificates/', get_certificates, name='get_certificates'),
    path('get-instructor-achivements/', views.get_instructor_achivements_view, name='get_instructor_achivements'),
    path('send-verification-email/', views.send_verification_email, name='send_verification_email'),
    path('reset_password/', views.reset_password, name='reset_password'),
    path('assessment/questions/', views.get_assessment_questions, name='get_assessment_questions'),
    path('assessment/submit/', views.submit_assessment, name='submit_assessment'),
    path('assessment/status/', views.check_assessment_status, name='check_assessment_status'),
    path('assessment/result/', views.get_assessment_result, name='get_assessment_result'),
    path('assessment/recommendations/', views.get_assessment_recommendations, name='get_assessment_recommendations'),
    path('assessment/reset/', views.reset_assessment, name='reset_assessment'),
]
