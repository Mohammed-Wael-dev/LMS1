from django.urls import path
from . import views

urlpatterns = [
 # ==========================
    # Enrollments
    # ==========================
    path('create-enroll/', views.enroll_course, name='enroll-course'),
    path('my-enrollments/', views.my_enrollments, name='my-enrollments'),
    path('enroll-instructor/', views.enroll_course_instructor, name='enroll-instructor'),
    path('enroll-delete/', views.enroll_course_instructor, name='enroll-student'),

    # ==========================
    # Reviews
    # ==========================
    path('reviews/', views.get_reivews, name='get-reivews'),
    path('create-review/', views.create_or_update_review, name='create_or_update_review'),
    path('update-review/', views.create_or_update_review, name='create_or_update_review'),
    path('get-reviews-course-student/', views.get_my_reviews, name='get_rivews_course_student'),
    path('get-reviews-course-instructor/', views.get_reviews_course_instructor, name='get_rivews_course_instructor'),

    # ==========================
    # Lesson Notes & Progress
    # ==========================
    path('lesson-notes/', views.lesson_note, name='lesson-notes'),
    path('create-lesson-progress/', views.create_lesson_progress, name='create_lesson_progress'),

    # ==========================
    # Questions & Answers
    # ==========================
    path('question/', views.question, name='question'),
    path('create-question/', views.create_or_update_question, name='create-question'),
    path('update-question/', views.create_or_update_question, name='update-question'),
    path('answer/', views.create_or_update_answer, name='answers'),

    # ==========================
    # Reactions
    # ==========================
    path('create-reaction/', views.create_reaction, name='create-reaction'),



    path("course-review-likes/", views.get_coursereview_likes , name="get_coursereview_likes" )



    


]
