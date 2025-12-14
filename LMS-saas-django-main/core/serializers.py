from rest_framework import serializers
from enrollment.models import StudentReview
from account.models import User
from course.models import Course


## Top Reviews Serializer
class SimpleUserSerializer(serializers.ModelSerializer):
    """Simple user serializer with basic info"""
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'profile_image']


class SimpleCourseSerializer(serializers.ModelSerializer):
    """Simple course serializer with title only"""
    class Meta:
        model = Course
        fields = ['id', 'title']


class SimpleReviewSerializer(serializers.ModelSerializer):
    """Simple review serializer with basic info"""
    student = SimpleUserSerializer(read_only=True)
    course = SimpleCourseSerializer(read_only=True)
    
    class Meta:
        model = StudentReview
        fields = [
            'id',
            'student',
            'course', 
            'rating',
            'comment',
            'created_at'
        ]
