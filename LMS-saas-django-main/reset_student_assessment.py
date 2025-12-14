# -*- coding: utf-8 -*-
"""
سكريبت لحذف جميع اختبارات المستخدم وإعادة تعيين حالة الاختبار
Usage: python reset_student_assessment.py student@gmail.com
"""
import os
import sys
import django

# Fix encoding for Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from account.models import User, UserAssessment

def reset_student_assessment(email):
    """حذف جميع اختبارات المستخدم وإعادة تعيين حالة الاختبار"""
    try:
        # Find user
        user = User.objects.get(email=email)
        print(f"[OK] Found user: {user.email}")
        
        # Delete all user assessments
        assessments_count = UserAssessment.objects.filter(user=user).count()
        UserAssessment.objects.filter(user=user).delete()
        print(f"[OK] Deleted {assessments_count} assessment answers")
        
        # Reset assessment status
        user.has_completed_assessment = False
        user.assessment_level = None
        user.save()
        print(f"[OK] Reset assessment status")
        
        print(f"\n[SUCCESS] User {email} can now retake the assessment")
        return True
        
    except User.DoesNotExist:
        print(f"[ERROR] User {email} not found")
        return False
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python reset_student_assessment.py <email>")
        print("Example: python reset_student_assessment.py student@gmail.com")
        sys.exit(1)
    
    email = sys.argv[1]
    reset_student_assessment(email)

