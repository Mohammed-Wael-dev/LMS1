from django.contrib import admin
from .models import StudentAnswer, Score

class StudentAnswerAdmin(admin.ModelAdmin):
    list_display = ("student", "question", "choice", "type", "submitted_at")
    search_fields = ("student__username", "question__text", "choice__text")
    list_filter = ("type",)

class ScoreAdmin(admin.ModelAdmin):
    list_display = ("student", "quiz", "score", "total_questions", "submitted_at")
    search_fields = ("student__username", "quiz__title")
    list_filter = ("quiz",)

admin.site.register(StudentAnswer, StudentAnswerAdmin)
admin.site.register(Score, ScoreAdmin)


from .models import *
# ----------------------
# QUIZ & QUESTION
# ----------------------
class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 2

@admin.register(Question)
class QuestionaAdmin(admin.ModelAdmin):
    list_display = ("text", "quiz", "question_type")
    search_fields = ("text",)
    list_filter = ("question_type",)
    inlines = [ChoiceInline]  

@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ("time_limit", "passing_score")

@admin.register(Choice)
class ChoiceAdmin(admin.ModelAdmin):
    list_display = ("text", "question", "is_correct")
    list_filter = ("is_correct",)
    search_fields = ("text",)
