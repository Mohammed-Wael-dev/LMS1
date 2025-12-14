from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import LessonProgress, Certificate
from course.models import Lesson 
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import transaction
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=LessonProgress)
def add_certification(sender, instance, **kwargs):
    """
    Check if student completed all lessons in the course.
    If yes, create a certification.
    """
    # Only process when lesson is marked as watched
    if not instance.watched:
        return
        
    student = instance.student
    lesson = instance.lesson
    course = lesson.section.course
    
    # Check if student is enrolled in the course
    from .models import Enrollment
    if not Enrollment.objects.filter(student=student, course=course).exists():
        logger.warning(f"Student {student.email} is not enrolled in course {course.title}")
        return
    
    try:
        with transaction.atomic():
            # Use the new method to create certificate if eligible
            certificate = Certificate.create_certificate_if_eligible(student, course)
            
            if certificate:
                logger.info(f"Certificate created/updated for {student.email} in course {course.title}")
            else:
                logger.info(f"Student {student.email} is not yet eligible for certificate in course {course.title}")
                
    except Exception as e:
        logger.error(f"Error creating certificate for {student.email} in course {course.title}: {str(e)}")