# -*- coding: utf-8 -*-
"""
Script to reset assessment for a specific user
Usage: python manage.py shell < reset_user_assessment.py
Or: python reset_user_assessment.py
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from account.models import User, UserAssessment

def reset_user_assessment(email):
    """Reset assessment for a specific user"""
    try:
        user = User.objects.get(email=email)
        
        # Delete all user assessments
        deleted_count = UserAssessment.objects.filter(user=user).delete()[0]
        
        # Reset user assessment fields
        user.has_completed_assessment = False
        user.assessment_level = None
        user.save()
        
        print(f"✅ تم حذف {deleted_count} إجابة للاختبار للمستخدم: {user.email}")
        print(f"✅ تم إعادة تعيين حالة الاختبار للمستخدم")
        print(f"   - has_completed_assessment: {user.has_completed_assessment}")
        print(f"   - assessment_level: {user.assessment_level}")
        
        return True
    except User.DoesNotExist:
        print(f"❌ المستخدم غير موجود: {email}")
        return False
    except Exception as e:
        print(f"❌ خطأ: {str(e)}")
        return False

if __name__ == "__main__":
    # Reset assessment for student@gmail.com
    email = "student@gmail.com"
    print(f"🔄 جاري إعادة تعيين الاختبار للمستخدم: {email}")
    print("-" * 50)
    reset_user_assessment(email)
    print("-" * 50)
    print("✅ تم الانتهاء!")

