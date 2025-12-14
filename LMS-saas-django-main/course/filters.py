from django_filters import rest_framework as filters
from django.db.models import Count, Q
from .models import *
from exam.models import Quiz
from shared.app_choices import AppChoices

class CourseFilter(filters.FilterSet):
    # Category filters
    category_id = filters.UUIDFilter(
        field_name="sub_category__category__id",
        lookup_expr="exact",
        help_text="Filter by main category ID"
    )
    subcategory_id = filters.UUIDFilter(
        field_name="sub_category__id",
        lookup_expr="exact",
        help_text="Filter by subcategory ID"
    )
    
    # Course filters
    level = filters.ChoiceFilter(
        choices=AppChoices.COURSE_LEVEL_CHOICES,
        help_text="Filter by course level"
    )
    is_paid = filters.BooleanFilter(
        help_text="Filter by course type (true for paid, false for free)"
    )
    
    # Search filter
    search = filters.CharFilter(
        method="filter_by_search",
        help_text="Search in title, description, instructor name"
    )
    
    # Sorting filters
    most_popular = filters.BooleanFilter(
        method="filter_most_popular",
        help_text="Sort by most popular (highest student count)"
    )
    highest_rated = filters.BooleanFilter(
        method="filter_highest_rated",
        help_text="Sort by highest rating"
    )
    newest = filters.BooleanFilter(
        method="filter_newest",
        help_text="Sort by newest courses"
    )
    price_low_to_high = filters.BooleanFilter(
        method="filter_price_low_to_high",
        help_text="Sort by price from low to high"
    )
    price_high_to_low = filters.BooleanFilter(
        method="filter_price_high_to_low",
        help_text="Sort by price from high to low"
    )
    featured_courses = filters.BooleanFilter(
        method="filter_featured_courses",
        help_text="Get top 3 courses by highest enrollment count"
    )
    
    def filter_by_search(self, queryset, name, value):
        """Search in title, description, instructor name"""
        if not value:
            return queryset
        return queryset.filter(
            Q(title__icontains=value) |
            Q(description__icontains=value) |
            Q(instructor__first_name__icontains=value) |
            Q(instructor__last_name__icontains=value) |
            Q(instructor__email__icontains=value)
        )
    
    def filter_most_popular(self, queryset, name, value):
        """Sort by most popular"""
        if value:
            return queryset.order_by("-total_students", "-created_at")
        return queryset
    
    def filter_highest_rated(self, queryset, name, value):
        """Sort by highest rating"""
        if value:
            return queryset.order_by("-average_rating", "-total_reviews")
        return queryset
    
    def filter_newest(self, queryset, name, value):
        """Sort by newest"""
        if value:
            return queryset.order_by("-created_at")
        return queryset
    
    def filter_price_low_to_high(self, queryset, name, value):
        """Sort by price from low to high"""
        if value:
            return queryset.order_by("price")
        return queryset
    
    def filter_price_high_to_low(self, queryset, name, value):
        """Sort by price from high to low"""
        if value:
            return queryset.order_by("-price")
        return queryset
    
    def filter_featured_courses(self, queryset, name, value):
        """Get top 3 courses by highest enrollment count"""
        if value:
            return queryset.order_by("-total_students", "-created_at")[:3]
        return queryset

    class Meta:
        model = Course
        fields = ["level", "is_paid", "subcategory_id", "category_id"]



class SectionFilter(filters.FilterSet):
    course = filters.CharFilter(field_name="course__id", lookup_expr="iexact")

    class Meta:
        model = Section
        fields = ["course"]


class QuizFilter(filters.FilterSet):
    lesson = filters.CharFilter(field_name="lesson__id", lookup_expr="iexact")

    class Meta:
        model = Quiz
        fields = ["lesson"]


class GroupCourseFilter(filters.FilterSet):
    course = filters.CharFilter(field_name="course", lookup_expr="exact")

    class Meta:
        model = GroupCourse
        fields = ["course"]


class SubCategoryFilter(filters.FilterSet):
    category = filters.CharFilter(field_name="category", lookup_expr="exact")

    class Meta:
        model = SubCategory
        fields = ["category"]