from rest_framework import serializers
from .models import Enrollment
from rest_framework.exceptions import ValidationError
from course.models import Course  
from account.serializers import BaseUserSerializer
from .models import *

class CourseSerializer(serializers.ModelSerializer):
    class Meta :
        model = Course
        fields = ('title' , "instructor__name" , "category__name" )

class EnrollmentSerializer(serializers.ModelSerializer):
     
    student  = serializers.HiddenField(default=serializers.CurrentUserDefault())

    def validate(self, attrs):
        course = attrs.get("course")
        if course.is_paid:
            raise ValidationError("This course is paid. Student must complete payment before enrollment.")

        return attrs
    class Meta:
        model = Enrollment
        fields = [
            "id",
            "student",  
            'course' ]
        
        read_only_fields = ["date_enrolled"]


class EnrollmentAllowSerializer(serializers.ModelSerializer):
    student = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_student=True),
        required=False
    )

    def validate(self, attrs):
        request = self.context['request']
        user = request.user
        course = attrs.get("course")
        student = attrs.get("student")

        if user.is_student:
            if student and student != user:
                raise ValidationError("Students cannot enroll other students.")
            attrs['student'] = user
    
        if course.is_paid and user.is_student:
            raise ValidationError("This course is paid. Student must complete payment before enrollment.")

        return attrs

    class Meta:
        model = Enrollment
        fields = ["id", "student", "course"]
        read_only_fields = ["date_enrolled"]
class DetilaEnrollmentSerializer(serializers.ModelSerializer):
     
    student  = serializers.HiddenField(default=serializers.CurrentUserDefault())
    class Meta:
        model = Enrollment
        fields = '__all__'
        depth = 1
        
class CourseLikeAspectSerializer(serializers.ModelSerializer):
     class Meta:
         model = CourseLikeAspect
         fields = "__all__"


class StudentReviewSerializer(serializers.ModelSerializer):
    student_ = BaseUserSerializer(source="student", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    student = serializers.HiddenField(default=serializers.CurrentUserDefault())
    like_course = serializers.PrimaryKeyRelatedField(
            queryset=CourseLikeAspect.objects.all(),
            many=True,
            write_only=True
        )
    like_course_details = CourseLikeAspectSerializer(
        source="like_course",
        many=True,
        read_only=True
    )

 
    class Meta:
        model = StudentReview
        fields = [
            "student_",
            "id",
            "course",
            "course_title",
            "student",
            'like_course',
            'like_course_details',
            'rating',
            'recommend',
            'anonymous',
            "comment",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        course = attrs.get("course")
        student = self.context["request"].user

        if not Enrollment.objects.filter(course=course, student=student).exists():
            raise serializers.ValidationError("You are not enrolled in this course and cannot review it.")

        return attrs
    

class LessonNoteSerializer(serializers.ModelSerializer):
    student = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = LessonNote
        fields = ["id", "lesson", "student", "title", "content", "created_at", "updated_at"]
        read_only_fields = ["student", "created_at", "updated_at"]

class AnswerSerializer(serializers.ModelSerializer):
    user_ = BaseUserSerializer(source="user", read_only=True)
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    count_likes  =  serializers.IntegerField(read_only=True)
    count_loves =  serializers.IntegerField(read_only=True)
    count_claps =  serializers.IntegerField(read_only=True)
    user_has_reaction = serializers.SerializerMethodField()
    user_reaction_type = serializers.SerializerMethodField()
    
    def get_user_has_reaction(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Use prefetched reactions if available
            if hasattr(obj, 'reactions'):
                user_reactions = [r for r in obj.reactions.all() if r.user == request.user]
                return len(user_reactions) > 0
            # Fallback to database query
            reaction = Reaction.objects.filter(user=request.user, answer=obj).first()
            return reaction is not None
        return False
    
    def get_user_reaction_type(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Use prefetched reactions if available
            if hasattr(obj, 'reactions'):
                user_reactions = [r for r in obj.reactions.all() if r.user == request.user]
                return user_reactions[0].type if user_reactions else None
            # Fallback to database query
            reaction = Reaction.objects.filter(user=request.user, answer=obj).first()
            return reaction.type if reaction else None
        return None
    
    class Meta:
        model = Answer
        fields = ["id", "question", "user_", 'user',"text", "created_at" , "count_likes" , "count_loves" , "count_claps", "user_has_reaction", "user_reaction_type"]
        read_only_fields = ["user", "created_at"]


class ReactionSerializer(serializers.ModelSerializer):
    user_reaction = serializers.ReadOnlyField(source="user.username" , read_only=True)
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())


    class Meta:
        model = Reaction
        fields = ["id", "user_reaction", 'user',"question", "answer", "type", "created_at"]
        read_only_fields = ["user", "created_at"]


class QuestionSerializer(serializers.ModelSerializer):
    student = serializers.HiddenField(default=serializers.CurrentUserDefault())
    student_ = BaseUserSerializer(source="student", read_only=True)
    answer = AnswerSerializer(read_only=True , many=True) 
    count_likes  =  serializers.IntegerField(read_only=True)
    count_loves =  serializers.IntegerField(read_only=True)
    count_claps =  serializers.IntegerField(read_only=True)
    user_has_reaction = serializers.SerializerMethodField()
    user_reaction_type = serializers.SerializerMethodField()

    def get_user_has_reaction(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Use prefetched reactions if available
            if hasattr(obj, 'reactions'):
                user_reactions = [r for r in obj.reactions.all() if r.user == request.user]
                return len(user_reactions) > 0
            # Fallback to database query
            reaction = Reaction.objects.filter(user=request.user, question=obj).first()
            return reaction is not None
        return False
    
    def get_user_reaction_type(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Use prefetched reactions if available
            if hasattr(obj, 'reactions'):
                user_reactions = [r for r in obj.reactions.all() if r.user == request.user]
                return user_reactions[0].type if user_reactions else None
            # Fallback to database query
            reaction = Reaction.objects.filter(user=request.user, question=obj).first()
            return reaction.type if reaction else None
        return None

    class Meta:
        model = Question
        fields = ["id", "lesson", "student",'student_', "text", "created_at", "answer" , "count_likes" , "count_loves" , "count_claps", "user_has_reaction", "user_reaction_type"]
        read_only_fields = ["student", "created_at"]


    def validate(self, attrs):
        lesson = attrs.get("lesson")
        student = self.context["request"].user
        course = lesson.section.course  
        if not Enrollment.objects.filter(course=course, student=student).exists():
            raise serializers.ValidationError("You are not enrolled in this course and cannot ask a question.")
        return attrs
    


class LessonProgressSerializer(serializers.ModelSerializer):
    student = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = LessonProgress
        fields = "__all__"
        validators = []  # نعطّل UniqueTogetherValidator الافتراضي

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["student"] = request.user

        watched = validated_data.get("watched", True)
        obj, created = LessonProgress.objects.get_or_create(
            student=validated_data["student"],
            lesson=validated_data["lesson"],
            defaults={"watched": watched},
        )

        # تحديث اختياري لو تغيّر watched
        if not created and "watched" in validated_data and obj.watched != watched:
            obj.watched = watched
            obj.save(update_fields=["watched"])

        self.context["created"] = created
        return obj


class CertificateSerializer(serializers.ModelSerializer):
    instractor = serializers.SerializerMethodField()
    image_course = serializers.ImageField(source='course.picture', read_only=True)
    title_course = serializers.CharField(source='course.title', read_only=True)

    def get_instractor(self, obj):
        instructor = obj.course.instructor
        if instructor.first_name and instructor.last_name:
            return f"{instructor.first_name} {instructor.last_name}"
        elif instructor.first_name:
            return instructor.first_name
        elif instructor.last_name:
            return instructor.last_name
        else:
            return instructor.email

    class Meta:
        model = Certificate
        fields = ['id', 'instractor', 'image_course', 'title_course', 'file', 'date_issued']

