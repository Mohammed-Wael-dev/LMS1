from rest_framework import serializers
from .models import Cart
from course.models import Course

class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ["id", "title", "picture", "price"]

class CartSerializer(serializers.ModelSerializer):
    courses = CourseSerializer(many=True, read_only=True)

    class Meta:
        model = Cart
        fields = ["id", "user", "courses", "created_at"]
        read_only_fields = ["user", "created_at"]
