from rest_framework import serializers
from .models import *
from drf_writable_nested import WritableNestedModelSerializer
from django.core.files.base import ContentFile
import base64
from shared.utilts import get_file_extension, get_file_extension_from_filename
from enrollment.models import Enrollment
from account.models import User
from django.shortcuts import get_object_or_404
class CourseCreateSerializer(serializers.ModelSerializer):
    instructor = serializers.HiddenField(default=serializers.CurrentUserDefault())
    class Meta:
        model = Course
        fields = ['id', 'title','instructor' ,'description', 'picture', 'price', 'sub_category', 'is_published', 'level', 'is_paid', 'is_sequential']
        extra_kwargs = {
            'is_sequential': {'required': False}
        }

from course.utils import Base64FileHandler

class LessonSerializer(serializers.ModelSerializer):
    section_id = serializers.CharField(write_only=True, required=False)
    is_locked = serializers.SerializerMethodField()
    watched = serializers.BooleanField(read_only=True)
    completed = serializers.SerializerMethodField()
    file_base64 = serializers.CharField(write_only=True, required=False, allow_blank=True)
    file_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    file_handler = Base64FileHandler(max_size_mb=50)
    class Meta:
        model = Lesson
        fields = ['id', 'title', 'description', 'url', 'duration_hours', 'free_preview', 'order', 'file', 'file_url', 'file_base64', 'file_name', 'description_html', 'content_type', 'section', 'section_id', 'is_locked', 'watched', 'completed']
        extra_kwargs = {
            'title': {'required': True},
            'section': {'required': True},
            'file': {'required': False},
            'file_url': {'required': False}
        }
    
    @classmethod
    def setup_eager_loading(cls, queryset, request):
        """
        Setup eager loading for lesson progress to avoid N+1 queries.
        """
        if request and request.user.is_authenticated:
            from django.db.models import Prefetch
            from enrollment.models import LessonProgress
            
            # Prefetch progress records for the current user
            queryset = queryset.prefetch_related(
                Prefetch(
                    'progress_lessons',
                    queryset=LessonProgress.objects.filter(
                        student=request.user,
                        watched=True
                    ),
                    to_attr='user_progress'
                )
            )
        return queryset
    
    def get_is_locked(self, obj):
        # Use the enhanced annotation
        return getattr(obj, 'is_locked', False)
    
    def get_completed(self, obj):
        """
        Check if the lesson is completed by the current user.
        Returns True if the lesson is watched (for videos) or completed (for other content types).
        Uses prefetched data for better performance.
        """
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
            
        # Use prefetched progress data if available
        if hasattr(obj, 'user_progress'):
            # Check if there's a progress record in the prefetched data
            return len(obj.user_progress) > 0
        elif hasattr(obj, 'progress_lessons'):
            # Check if there's a progress record with watched=True
            for progress in obj.progress_lessons.all():
                if progress.student == request.user and progress.watched:
                    return True
            return False
        else:
            # Fallback to direct query if prefetch is not available
            from enrollment.models import LessonProgress
            try:
                progress = LessonProgress.objects.get(
                    student=request.user,
                    lesson=obj,
                    watched=True
                )
                return True
            except LessonProgress.DoesNotExist:
                return False
    
    def _handle_base64_file(self, validated_data):
        return self.file_handler.attach_file(
            validated_data,
            base64_key='file_base64',
            name_key='file_name',
            target_key='file',
        )
    
    def create(self, validated_data):
        validated_data = self._handle_base64_file(validated_data)
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        validated_data = self._handle_base64_file(validated_data)
        return super().update(instance, validated_data)

class LessonReorderSerializer(serializers.Serializer):
    lessons = serializers.ListField()
    
    def save(self):
        lessons_to_update = []
        for item in self.validated_data['lessons']:
            try:
                lesson = Lesson.objects.get(id=item['lesson_id'])
                lesson.order = item['order']
                lessons_to_update.append(lesson)
            except Lesson.DoesNotExist:
                pass
        
        Lesson.objects.bulk_update(lessons_to_update, ['order'])
        
class SectionSerializer(WritableNestedModelSerializer):
    lessons = LessonSerializer(many=True , required=False)
    lesson_count = serializers.IntegerField(read_only=True)
    total_hours = serializers.FloatField(read_only=True)
    watched = serializers.BooleanField(read_only=True)
    is_locked = serializers.BooleanField(read_only=True)
    total_lessons = serializers.IntegerField(read_only=True)
    completed_lessons = serializers.IntegerField(read_only=True)
    progress_percentage = serializers.FloatField(read_only=True)
    class Meta:
        model = Section
        fields = ['id', 'title','course', 'description', 'order','lesson_count','total_hours', 'lessons','watched', 'is_locked', 'total_lessons', 'completed_lessons', 'progress_percentage']

class SectionWithoutLessonsSerializer(serializers.ModelSerializer):
    lesson_count = serializers.IntegerField(read_only=True)
    total_hours = serializers.FloatField(read_only=True)
    watched = serializers.BooleanField(read_only=True)
    is_locked = serializers.BooleanField(read_only=True)
    total_lessons = serializers.IntegerField(read_only=True)
    completed_lessons = serializers.IntegerField(read_only=True)
    progress_percentage = serializers.FloatField(read_only=True)
    
    class Meta:
        model = Section
        fields = ['id', 'title', 'course', 'description', 'order', 'lesson_count', 'total_hours', 'watched', 'is_locked', 'total_lessons', 'completed_lessons', 'progress_percentage']


class SectionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating sections without lessons"""
    class Meta:
        model = Section
        fields = ['id', 'title', 'course', 'description', 'order']

class LearningObjectiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningObjective
        fields = ['id', 'text']

class RequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Requirement
        fields = ['id', 'text']

class InstructorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name','profile_image', 'id' , 'bio']

class CourseDetailSerializer(serializers.ModelSerializer):
    objectives = LearningObjectiveSerializer(many=True)
    requirements = RequirementSerializer(many=True)
    instructor = InstructorSerializer(read_only=True)  
    average_rating = serializers.FloatField(read_only=True)
    total_reviews = serializers.IntegerField(read_only=True)
    is_best_seller = serializers.BooleanField(read_only=True)
    total_enrollments = serializers.IntegerField(read_only=True)
    total_students = serializers.IntegerField(read_only=True)
    total_hours = serializers.FloatField(read_only=True)
    has_reviewed = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'slug', 'subtitle', 'description', 'sub_category','language' , 'instructor' , 'old_price', 'total_enrollments','total_students', 'total_hours',
            'price', 'is_paid', 'level', 'is_published', 'is_sequential', 'created_at', 'updated_at', 'total_students','average_rating', 'total_reviews','is_best_seller',
            'objectives', 'requirements','picture', 'has_certificate', 'has_reviewed'
        ]
    
    def get_has_reviewed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            from enrollment.models import StudentReview
            return StudentReview.objects.filter(course=obj, student=request.user).exists()
        return False

class CourseSerializer(serializers.ModelSerializer):
    instructor = InstructorSerializer(read_only=True)
    instructor_info = serializers.JSONField(read_only=True)
    average_rating = serializers.FloatField(read_only=True)
    total_reviews = serializers.IntegerField(read_only=True)
    is_best_seller = serializers.BooleanField(read_only=True)
    total_enrollments = serializers.IntegerField(read_only=True)
    total_students = serializers.IntegerField(read_only=True)
    total_hours = serializers.FloatField(read_only=True)
    objectives = LearningObjectiveSerializer(many=True)


    class Meta:
        model = Course
        fields = [
            'id', 'title', 'picture', 'subtitle', 'description', 'language','sub_category', 'instructor','instructor_info' ,'old_price', 'total_enrollments','total_students', 'total_hours',
            'price', 'is_paid', 'level', 'is_published', 'is_sequential', 'created_at', 'updated_at' ,  'average_rating', 'total_reviews'  , 'is_best_seller' , 'objectives'
        ]




class CourseSerializerV2(serializers.ModelSerializer):
    total_students = serializers.IntegerField(read_only=True)
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2, read_only=True)
    total_reviews = serializers.IntegerField(read_only=True)
    instructor = InstructorSerializer(read_only=True)
    class Meta:
        model = Course
        fields = ["id", "title", "picture", "total_students", "average_rating", "total_reviews",'level','old_price','price', 'instructor',"duration", "is_sequential"]





class SubCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SubCategory
        fields = ['id', 'name', 'description' , 'category']

class SubCategoryFiltersSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubCategory
        fields = ['id', 'name']

class CategorySerializer(serializers.ModelSerializer):
    total_courses = serializers.IntegerField( read_only=True)
    class Meta:
        model = Category
        fields = ['id', 'name', 'description' , 'icon', 'color' , 'total_courses']

class CategoryFiltersSerializer(serializers.ModelSerializer):
    subcategories = SubCategoryFiltersSerializer(many=True, read_only=True)
    class Meta:
        model = Category
        fields = ['id', 'name', 'subcategories']


class BestSellerSerializer(serializers.ModelSerializer):
    total_enrollments = serializers.IntegerField(read_only=True)
    total_students = serializers.IntegerField(read_only=True)
    instructor = InstructorSerializer(read_only=True)
    totla_hours = serializers.FloatField(read_only=True)
    average_rating = serializers.FloatField(read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'title','subtitle', 'description', 'total_enrollments','average_rating' , 'total_students','price', 'level'  , 'instructor' ,'totla_hours' , 'picture' , 'duration'  , 'old_price', 'is_sequential']
        
class CourseInstructorSerializer(serializers.ModelSerializer):
    total_students = serializers.IntegerField(read_only=True)
    total_courses = serializers.IntegerField(read_only=True)
    total_reviews = serializers.IntegerField(read_only=True)
    average_rating =  serializers.FloatField(read_only=True)
    instructor   = InstructorSerializer(read_only=True)
    class Meta:
        model = Course
        fields = ['title','total_students', 'total_courses' , 'instructor' , 'total_reviews' , 'average_rating', 'is_sequential']



class CourseEnrollmentSerializer(serializers.ModelSerializer):
    completed_lessons = serializers.IntegerField(read_only=True)
    progress = serializers.FloatField(read_only=True)
    last_accessed = serializers.DateTimeField(read_only=True)
    sub_category  = SubCategorySerializer(read_only=True)
    total_hours = serializers.FloatField(read_only=True)
    average_rating = serializers.FloatField(read_only=True)
    lessons_progress = serializers.CharField(read_only=True)  

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "description",
            "completed_lessons",
            "progress",
            "lessons_progress",  
            "last_accessed",
            "sub_category",
            "total_hours",
            "average_rating",
            "is_sequential"
        ]


class CourseInstructorStatsSerializer(serializers.ModelSerializer):
    total_students = serializers.IntegerField(read_only=True)
    total_courses = serializers.IntegerField(read_only=True)
    total_reviews = serializers.IntegerField(read_only=True)
    average_rating = serializers.FloatField(read_only=True) 
    revenue = serializers.FloatField(read_only=True)
    instructor = InstructorSerializer(read_only=True)

    class Meta:
        model = Course
        fields = [
            'id',
            "title",
            "picture",
            'is_published',
            'is_sequential',
            'updated_at',
            "total_students",
            "total_courses",
            "total_reviews",
            "average_rating",
            "revenue",
            "instructor",
        ]


class CourseInstructorProfileSerializer(serializers.ModelSerializer):
    total_students = serializers.IntegerField(read_only=True)
    total_courses = serializers.IntegerField(read_only=True)
    total_reviews = serializers.IntegerField(read_only=True)
    average_rating = serializers.FloatField(read_only=True) 
    revenue = serializers.FloatField(read_only=True)
    instructor = InstructorSerializer(read_only=True)

    class Meta:
        model = Course
        fields = [
            "title",
            "picture",
            "total_students",
            "total_courses",
            "total_reviews",
            "average_rating",
            "revenue",
            "instructor",
            "is_sequential",
        ]


class StudentCourseSerializer(serializers.ModelSerializer):
    students = serializers.JSONField(read_only=True)
    class Meta:
        model = Course
        fields = ['id', 'title', 'students', 'is_sequential' ]
        

    def get_students(self, obj):
        request = self.context.get("request")
        students = obj.students or []
        for student in students:
            image = student.get("profile_image")
            if image:
                student["profile_image"] = request.build_absolute_uri(image)
                print(student["profile_image"])
        return students



class GroupCourseSerializer(serializers.ModelSerializer):

    teacher = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = GroupCourse
        fields = ['id', 'name', 'description', 'course', 'teacher', 'created_at', 'members']
        read_only_fields = ['created_at']

    def create(self, validated_data):
        members_data = validated_data.pop('members', [])
        group = GroupCourse.objects.create(**validated_data)
        if members_data:
            group.members.set(members_data)
        return group

    def update(self, instance, validated_data):
        members_data = validated_data.pop('members', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if members_data is not None:
            instance.members.set(members_data)
        return instance


# Enrollment Serializers
class AddStudentToCourseSerializer(serializers.Serializer):
    email = serializers.EmailField()
    
    def validate_email(self, value):
        user = get_object_or_404(User, email=value)
        if not user.is_student:
            raise serializers.ValidationError("User is not a student")
        return value
    
    def create(self, validated_data):
        course = self.context['course']
        email = validated_data['email']
        student = User.objects.get(email=email)
        
        # Check if student is already enrolled
        if Enrollment.objects.filter(student=student, course=course).exists():
            raise serializers.ValidationError("Student is already enrolled in this course")
        
        Enrollment.objects.create(student=student, course=course)
        return validated_data


class RemoveStudentFromCourseSerializer(serializers.Serializer):
    email = serializers.EmailField()
    
    def validate_email(self, value):
        user = get_object_or_404(User, email=value)
        if not user.is_student:
            raise serializers.ValidationError("User is not a student")
        return value
    
    def create(self, validated_data):
        course = self.context['course']
        email = validated_data['email']
        student = User.objects.get(email=email)
        
        enrollment = Enrollment.objects.get(student=student, course=course)
        enrollment.delete()
        return validated_data

class SectionReorderSerializer(serializers.Serializer):
    sections = serializers.ListField()
    
    def save(self):
        sections_to_update = []
        for item in self.validated_data['sections']:
            try:
                section = Section.objects.get(id=item['section_id'])
                section.order = item['order']
                sections_to_update.append(section)
            except Section.DoesNotExist:
                pass
        
        Section.objects.bulk_update(sections_to_update, ['order'])


class AssessmentSerializer(serializers.ModelSerializer):
    """Serializer for assessment lessons (content_type='assessment')"""
    course_title = serializers.CharField(source='section.course.title', read_only=True)
    section_title = serializers.CharField(source='section.title', read_only=True)
    
    class Meta:
        model = Lesson
        fields = ['id', 'title', 'description', 'content_type', 'course_title', 'section_title']
    
    def to_representation(self, instance):
        """Customize the response to only include required fields"""
        data = super().to_representation(instance)
        return {
            'id': data['id'],
            'title': data['title'],
            'description': data['description'],
            'content_type': data['content_type']
        }


class ChoiceStatisticsSerializer(serializers.Serializer):
    """Serializer for choice statistics"""
    id = serializers.UUIDField()
    text = serializers.CharField()
    answer_count = serializers.IntegerField()
    percentage = serializers.FloatField()


class QuestionStatisticsSerializer(serializers.Serializer):
    """Serializer for question statistics"""
    id = serializers.UUIDField()
    text = serializers.CharField()
    total_answers = serializers.IntegerField()
    choices = ChoiceStatisticsSerializer(many=True)


class AssessmentStatisticsSerializer(serializers.Serializer):
    """Serializer for assessment statistics"""
    id = serializers.UUIDField()
    title = serializers.CharField()
    description = serializers.CharField()
    total_questions = serializers.IntegerField()
    total_students_attempted = serializers.IntegerField()
    questions = QuestionStatisticsSerializer(many=True)


class LastCourseProgressSerializer(serializers.ModelSerializer):
    """Serializer for last course with progress information"""
    category_name = serializers.CharField(source='sub_category.category.name', read_only=True)
    completed_lessons = serializers.IntegerField(read_only=True)
    total_lessons = serializers.IntegerField(read_only=True)
    progress_percentage = serializers.FloatField(read_only=True)
    last_accessed = serializers.DateTimeField(read_only=True)
    remaining_hours = serializers.SerializerMethodField()
    estimated_completion_time = serializers.SerializerMethodField()
    
    class Meta:
        model = Course
        fields = [
            'id', 'title', 'picture', 'category_name', 'completed_lessons', 
            'total_lessons', 'progress_percentage', 'last_accessed', 
            'remaining_hours', 'estimated_completion_time', 'is_sequential'
        ]
    
    def get_remaining_hours(self, obj):
        """Calculate remaining hours based on progress"""
        if hasattr(obj, 'total_hours') and hasattr(obj, 'completed_lessons') and hasattr(obj, 'total_lessons'):
            if obj.total_lessons > 0:
                progress_ratio = obj.completed_lessons / obj.total_lessons
                remaining_ratio = 1 - progress_ratio
                return round(obj.total_hours * remaining_ratio, 2)
        return 0.0
    
    def get_estimated_completion_time(self, obj):
        """Estimate time to complete the course based on average learning pace"""
        if hasattr(obj, 'remaining_hours') and obj.remaining_hours > 0:
            # Assuming average learning pace of 1 hour per day
            days_to_complete = obj.remaining_hours / 1.0
            if days_to_complete < 1:
                return "Less than a day"
            elif days_to_complete < 7:
                return f"{int(days_to_complete)} days"
            elif days_to_complete < 30:
                weeks = days_to_complete / 7
                return f"{int(weeks)} weeks"
            else:
                months = days_to_complete / 30
                return f"{int(months)} months"
        return "Not specified"

