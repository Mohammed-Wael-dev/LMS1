from rest_framework.exceptions import APIException
from rest_framework.permissions import BasePermission

class CustomPermissionDenied(APIException):
    status_code = 403
    default_detail = 'Permission denied.'
    default_code = 'permission_denied'

    def __init__(self, detail=None, code=None):
        if detail is not None:
            self.detail = {'error': detail, 'status': False, 'data': None}
        else:
            self.detail = {'error': self.default_detail, 'status': False, 'data': None}

def permission_denied(message):
        raise CustomPermissionDenied(detail=message)

class IsInstructor(BasePermission):
    """
    Allows access only to users instructor.
    """

    def has_permission(self, request, view):
        if not request.user.is_instructor:
            return permission_denied("You must be instructor to access this resource.")
        else:
            return True

class CanAccessLesson(BasePermission):
    """Permission to check if student can access a lesson based on sequential learning"""
    
    def has_object_permission(self, request, view, obj):
        if request.user.is_instructor:
            return True
            
        return obj.section.course.can_student_access_lesson(request.user, obj)


