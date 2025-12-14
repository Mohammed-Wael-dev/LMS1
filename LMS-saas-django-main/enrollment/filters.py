from django_filters import rest_framework as filters
from .models import *

class StudentReviewFilter(filters.FilterSet):
    course = filters.CharFilter(field_name="course", lookup_expr="exact")

    class Meta:
        model = StudentReview
        fields = ["course"]


class LessonNoteFilter(filters.FilterSet):
    lesson = filters.CharFilter(field_name="lesson", lookup_expr="exact")

    class Meta:
        model = LessonNote
        fields = ["lesson"]

class QuestionFilter(filters.FilterSet):
    lesson = filters.CharFilter(field_name="lesson", lookup_expr="exact")

    class Meta:
        model = Question
        fields = ["lesson"]


class CourseLikeAspectFilter(filters.FilterSet):
    type = filters.CharFilter(field_name="type", lookup_expr="exact")
    
    class Meta:
        model = CourseLikeAspect
        fields = ["type"]


