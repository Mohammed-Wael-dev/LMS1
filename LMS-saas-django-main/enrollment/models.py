from django.db import models
from course.models import  Course
from account.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from course.models import Lesson
from .conf import LIKE_CHOICES , TYPEREVIEW 
from .manager import *
class Enrollment(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE , related_name="student_enrollments")
    course = models.ForeignKey(Course, on_delete=models.CASCADE , related_name="enrollments")
    date_enrolled = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("student", "course")

class Certificate(models.Model):
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="certificates"
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="certificates"
    )
    file = models.FileField(
        upload_to="certificates/",
        blank=True,
        null=True,
        help_text="Generated certificate file (PDF or image)"
    )
    date_issued = models.DateTimeField(auto_now_add=True)

    objects = CertificateQuerySet.as_manager()

    class Meta:
        unique_together = ("student", "course")

    def __str__(self):
        return f"{self.student} - {self.course}"
    
    @classmethod
    def should_issue_certificate(cls, student, course):
        """
        Check if a certificate should be issued for a student in a course.
        Returns True if all lessons are completed.
        """
        from course.models import Lesson
        
        # Check if course has certificate enabled
        if not course.has_certificate:
            return False
            
        # Count total lessons in the course
        total_lessons = Lesson.objects.filter(section__course=course).count()
        
        # Count watched lessons for this student in this course
        watched_lessons = LessonProgress.objects.filter(
            student=student,
            lesson__section__course=course,
            watched=True
        ).count()
        
        # Check if all lessons are completed
        return watched_lessons == total_lessons and total_lessons > 0
    
    @classmethod
    def create_certificate_if_eligible(cls, student, course):
        """
        Create a certificate if the student is eligible.
        Returns the certificate object or None.
        """
        if not cls.should_issue_certificate(student, course):
            return None
            
        # Check if certificate already exists
        certificate, created = cls.objects.get_or_create(
            student=student,
            course=course
        )
        
        return certificate


class CourseLikeAspect(models.Model):
    name = models.CharField(max_length=100, unique=True)
    type = models.CharField(max_length=10, choices=TYPEREVIEW, default="positive")

    def __str__(self):
        return self.name

class StudentReview(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="reviews")
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="course_reviews")
    rating = models.PositiveSmallIntegerField(choices=[(i, i) for i in range(1, 6)],default=5,validators=[MinValueValidator(1), MaxValueValidator(5)])
    like_course = models.ManyToManyField(CourseLikeAspect, related_name="reviews_likes", blank=True)
    comment = models.TextField(blank=True, null=True, max_length=500)
    recommend = models.BooleanField(default=True)
    anonymous = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("course", "student")
        ordering = ["-created_at"]

    def __str__(self):
        reviewer = "Anonymous" if self.anonymous else self.student
        return f"{reviewer} - {self.course} ({self.rating}⭐)"

class LessonNote(models.Model):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="notes")
    student = models.ForeignKey(User , on_delete=models.CASCADE)
    title = models.CharField(max_length=255, blank=True, null=True)
    content = models.TextField()  
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("student", "lesson", "content") 

    def __str__(self):
        return f"{self.student} - {self.lesson} - {self.title or 'Note'}"



class Question(models.Model):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="questions")
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="student_question")
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    objects = QuestionQuerySet.as_manager()


    def __str__(self):
        return f"Q: {self.text[:50]}"


class Answer(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="answer")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="answers_user" , null=True, blank=True)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    objects = AnswerQuerySet.as_manager()

    def __str__(self):
        return f"A: {self.text[:50]}"

class Reaction(models.Model):
    REACTION_CHOICES = [
        ("like", "👍 Like"),
        ("love", "❤️ Love"),
        ("clap", "👏 Clap"),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE, null=True, blank=True, related_name="reactions")
    answer = models.ForeignKey(Answer, on_delete=models.CASCADE, null=True, blank=True, related_name="reactions")
    type = models.CharField(max_length=10, choices=REACTION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {self.type}"


    
class LessonProgress(models.Model):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="progress_lessons")
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="progress_user")
    watched = models.BooleanField(default=False)
    watched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("student", "lesson") 

    def __str__(self):
        return f"{self.student} - {self.lesson}"
    

