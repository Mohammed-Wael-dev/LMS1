from django.db import models
from account.models import User
from shared.models import UUIDMixin
from shared.conf import *
from .manager import ScoreQuerySet
from course.models import Lesson


class Quiz(UUIDMixin):
    lesson = models.OneToOneField(Lesson,on_delete=models.CASCADE, related_name='quizzes',null=True, blank=True)
    type = models.CharField(max_length=10, choices=QUIZ_EXAM_TYPE, default=QUIZ)
    time_limit = models.PositiveIntegerField(default=30, help_text="Minutes" , null=True , blank=True)
    passing_score = models.PositiveIntegerField(default=70, help_text="Percentage required to pass" , null=True , blank=True)

    def __str__(self):
        return f" {self.lesson.title}"
    
    class Meta :
        verbose_name_plural = "Quizze and Exams"
        


class Question(UUIDMixin):
    """Questions inside a quiz"""
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField()  # The question text
    question_type = models.CharField(max_length=10, choices=QUESTION_TYPE_CHOICES, default="mcq")
    explanation = models.TextField(blank=True, help_text="Optional explanation for the correct answer")
    points = models.PositiveIntegerField(default=1)

    def __str__(self):

        return self.text[:50]

class Choice(UUIDMixin):
    """Multiple choice options for a question"""
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='choices')
    text = models.CharField(max_length=255) 
    is_correct = models.BooleanField(default=False, null=True , blank=True)

    def __str__(self):
        return f"{self.text} ({'Correct' if self.is_correct else 'Wrong'})"




class StudentAnswer(UUIDMixin):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="quiz_answers")
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="student_answers")
    choice = models.ForeignKey(Choice, on_delete=models.CASCADE, related_name="choice_answers")
    type = models.CharField(max_length=10, choices=QUIZ_EXAM_TYPE, default=QUIZ)
    attempt = models.PositiveIntegerField(default=1)
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ("student", "question" , "attempt" ) 

    def __str__(self):
        return f"{self.student} - {self.question} -> {self.choice}"
    

class Score(UUIDMixin):

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="quiz_scores")
    quiz = models.ForeignKey(
        Quiz, on_delete=models.CASCADE, related_name="scores"
    )
    attempt = models.PositiveIntegerField(default=1)
    score = models.PositiveIntegerField(default=0)
    total_questions = models.PositiveIntegerField(default=0)
    submitted_at = models.DateTimeField(auto_now_add=True)

    objects = ScoreQuerySet.as_manager()


    def __str__(self):
        return f"{self.student} - Score: {self.score}/{self.total_questions}"