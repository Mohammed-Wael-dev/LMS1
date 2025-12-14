from django.db import models
from shared.models import UUIDMixin
from account.models import User
from django.utils.text import slugify
from .conf import *
from shared.conf import *
from .manager import *
from django.db import models
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from tinymce.models import HTMLField
from .validation import ValidationCourse
from shared.app_choices import AppChoices

class Category(UUIDMixin):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.TextField(blank=True, null=True)
    color = models.CharField(max_length=10, blank=True, null=True)
    objects : models.QuerySet = CategoryQuerySet .as_manager()


    def __str__(self):
        return self.name

class SubCategory(UUIDMixin):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="subcategories" , null=True , blank=True)  
    objects : models.QuerySet = SubCategoryQuerySet .as_manager()

    def __str__(self):
        return self.name


class Course(UUIDMixin , ValidationCourse):
    """Course basic info"""
    picture = models.ImageField(upload_to="courses/pictures/", blank=True, null=True)
    title = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=220, unique=True, blank=True)  #!!!
    subtitle = models.CharField(max_length=500 , blank=True , null=True)  
    description = models.TextField( null=True, blank=True)
    sub_category = models.ForeignKey(SubCategory, on_delete=models.SET_NULL, related_name="courses", null=True, blank=True)
    instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="instructor_courses" )

    price = models.DecimalField(max_digits=8, decimal_places=2 , null=True, blank=True) 
    old_price = models.DecimalField(max_digits=8, decimal_places=2, default=0.00, blank=True, null=True)
    is_paid = models.BooleanField(default=False)
    has_certificate = models.BooleanField(default=False)

    level = models.CharField(max_length=20, choices=AppChoices.COURSE_LEVEL_CHOICES, default="beginner" , null=True, blank=True)
    is_published = models.BooleanField(default=False)
    is_sequential = models.BooleanField(default=False, help_text="If True, students must complete lessons in order")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    language = models.CharField(max_length=20, null=True, blank=True, default="ar")
    search_vector = SearchVectorField(null=True , blank=True)
    
    duration = models.DecimalField(max_digits=5, decimal_places=2, help_text="Duration in min (e.g., 12.5)" , null=True , blank=True)
    objects : models.QuerySet = CourseQuerySet.as_manager()


    class Meta:
        ordering = ["-created_at"]

        indexes = [
            GinIndex(fields=["search_vector"]),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            self.slug = base_slug
            counter = 1
            while Course.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f"{base_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title
    
    def can_student_access_lesson(self, student, lesson):
        from enrollment.models import Enrollment
        if not self.is_sequential:
            return True
            
        # Check if the student is enrolled in the course
        if not Enrollment.objects.filter(student=student, course=self).exists():
            return False
            
        # Use the enhanced annotation
        course_data = Course.objects.filter(
            id=self.id
        ).with_sequential_access(student).first()
        
        if not course_data:
            return False
            
        # Check if the previous lesson is completed
        last_completed_order = course_data.last_completed_lesson_order
        if last_completed_order is None:
            # First lesson in the course
            return lesson.order == 1
            
        return lesson.order <= last_completed_order + 1

class LearningObjective(UUIDMixin):
    """At least 4 learning outcomes per course"""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="objectives")
    text = models.CharField(max_length=500)

    def __str__(self):
        return self.text


class Requirement(UUIDMixin):
    """Course requirements (skills/tools needed)"""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="requirements")
    text = models.CharField(max_length=500)

    def __str__(self):
        return self.text

class Section(UUIDMixin):
    """Course is divided into sections"""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="sections")
    title = models.CharField(max_length=255 , null=True, blank=True)
    description = models.TextField( null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    objects = SectionQuerySet.as_manager()

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class Lesson(UUIDMixin):
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    url = models.URLField(blank=True, null=True)
    file = models.FileField(upload_to="lessons/files/", blank=True, null=True)
    file_url = models.URLField(blank=True, null=True)
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPE_CHOICES, default=VIDEO)
    duration_hours = models.FloatField(blank=True, null=True, help_text="Duration in hours")
    free_preview = models.BooleanField(default=False)
    description_html = HTMLField(blank=True , null=True)
    json_data = models.JSONField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    objects = LessonQuerySet.as_manager()
    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.section.course.title} - {self.section.title} - {self.title}"







class GroupCourse(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="group_courses")
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name="group_courses")
    created_at = models.DateTimeField(auto_now_add=True)
    members = models.ManyToManyField(
        User,
        related_name="groups_joined",
        blank=True
    )
    class Meta:
        db_table = "groupcourse"
    def __str__(self):
        return self.name