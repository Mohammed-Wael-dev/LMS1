
from django.urls import path
from .views import *

urlpatterns = [
      path("exam-quiz/", exam_quiz_view, name="get-quizs"),
      path("get-student-answers/", get_student_answers, name="get-student-answers"),
]
