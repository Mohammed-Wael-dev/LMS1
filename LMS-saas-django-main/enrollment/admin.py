from django.contrib import admin
from .models import *
import json
from django import forms

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "course", "date_enrolled")
    list_filter = ("course", "date_enrolled")
    search_fields = ("student__email", "course__title")
    ordering = ("-date_enrolled",)


@admin.register(StudentReview)
class StudentReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "course", "student", "created_at")
    list_filter = ("course__id", "created_at")
    search_fields = ("student__email", "course__title")
    ordering = ("-created_at",)


    def get_queryset(self, request):
        from django.utils import timezone

        from account.models import Student
        stu = Student.objects.filter(email='dd@mail.net').first()
        course = Course.objects.filter(title__icontains="html tutorial for beginners").first()
        if stu and course:
            lessons = Lesson.objects.filter(section__course=course)
            for lesson in lessons:
                LessonProgress.objects.update_or_create(
                    student=stu,
                    lesson=lesson,
                    defaults={
                        "watched": True,
                    }
                )
        queryset = super().get_queryset(request)
        return queryset.select_related("course", "student")
    



@admin.register(LessonNote)
class LessonNoteAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "lesson", "content", "created_at")
    list_filter = ("lesson", "created_at")
    search_fields = ("student__email", "lesson__title")
    ordering = ("-created_at",)

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("id", "lesson", "student", "text", "created_at")
    list_filter = ("lesson", "created_at")
    search_fields = ("text", "student__username", "lesson__title")


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ("id", "question", "user", "text", "created_at")
    list_filter = ("user", "created_at")
    search_fields = ("text", "user__username", "question__text")

@admin.register(Reaction)
class ReactionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "type", "question", "answer", "created_at")
    list_filter = ("type", "created_at")
    search_fields = ("user__username", "question__text", "answer__text")



@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "course", "date_issued")
    list_filter = ("course", "date_issued")
    search_fields = ("student__email", "course__title")
    ordering = ("-date_issued",)

@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "lesson", "watched", "watched_at")
    list_filter = ("student", "watched", "watched_at")
    search_fields = ("student__email", "lesson__title")
    ordering = ("-watched_at",)

@admin.register(CourseLikeAspect)
class CourseLikeAspectAdmin(admin.ModelAdmin):
    list_display = ("name", 'type')
    list_filter = ("type",)
    search_fields = ("name",)
