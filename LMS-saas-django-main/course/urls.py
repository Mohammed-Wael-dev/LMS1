from django.urls import path
from .views import *

urlpatterns = [
    ## Category
    path("categories/", get_categories, name="get_categories"),
    path("categories_filters/", get_categories_filters, name="get_categories_filters"),
    ## Sub Category
    path('get-sub-categories/' , get_sub_categories, name='get_sub_categories'),
    # Level Courses
    path("course_levels/", course_levels, name="course_levels"),
    

    ## Instructor Course
    # TODO: Remove if not needed
    path("instructor/<uuid:instructor_pk>/course/<uuid:course_pk>/", get_instructor_course, name="get_instructor_course"), 
    path('get-course-enrollment/<uuid:course_pk>/', get_course_enrollments, name='get_course_enrollments'),
    # TODO: change url path to courses-instructor
    path('course-instructor-stats/', course_instructors, name='course_instructors'),
    path('course-instructor/<uuid:course_id>/', course_instructors, name='course_instructor_detail'),
    path('create-course/', course_crud, name='create_course'),
    path('update-course/<uuid:course_id>/', course_crud, name='update_course'),
    path('delete-course/<uuid:course_id>/', course_crud, name='delete_course'),

    ## Student Course
    # TODO: change url path to courses-student
    path('get-student-courses/<uuid:pk>/' , get_student_courses, name='get_student_courses'),
    path('add-student-to-course/<uuid:pk>/', add_student_to_course, name='add_student_to_course'),
    path('remove-student-from-course/<uuid:pk>/', remove_student_from_course, name='remove_student_from_course'),

    ## Course
    path("courses/", get_courses, name="get_courses"),
    path("courses/<uuid:pk>/", get_courses, name="courses"),
    path("v2/courses/", get_courses_v2, name="get_courses_v2"),
    path("v2/courses/<uuid:pk>/", get_courses_v2, name="get_courses_v2_detail"),
    
    ## Section
    path("get-sections/", get_sections, name="get_sections"),
    path('create-section/', create_or_update_or_delete_section, name='create_section'),
    path('update-section/<uuid:section_id>/', create_or_update_or_delete_section, name='update_section'),
    path('delete-section/<uuid:section_id>/', create_or_update_or_delete_section, name='delete_section'),
    path('get-section/<uuid:section_id>/', create_or_update_or_delete_section, name='get_section'),
    path('reorder-sections/', reorder_sections, name='reorder_sections'),

    ## Lesson
    path('lessons/', lesson_crud, name='lesson_crud'),
    path('lessons/<uuid:section_id>/', lesson_crud, name='lesson_crud_section'),
    path('lesson/<uuid:lesson_id>/', lesson_crud, name='lesson_crud_detail'),
    path('reorder-lessons/', reorder_lessons, name='reorder_lessons'),

    ## Exam
    path('quiz/<uuid:lesson_pk>/', git_quizs, name='git_quizs'),
    path('create-exam/<uuid:lesson_id>/', create_or_update_exam_quiz, name='create_exam_quiz'),
    path('update-exam/<uuid:lesson_id>/', create_or_update_exam_quiz, name='update_exam_quiz'),
    path('delete-exam/<uuid:lesson_id>/', create_or_update_exam_quiz, name='delete_exam_quiz'),

    ## Assessment
    path('assessments/', get_assessments, name='get_assessments'),
    path('assessments/<uuid:assessment_id>/statistics/', get_assessment_statistics, name='get_assessment_statistics'),

    ## Best Sellers
    path('best-sellers/', get_categories_best_sellers, name='get_categories_best_sellers'),
    
    ## Last Course Progress
    path('last-course-progress/', get_last_course_progress, name='get_last_course_progress'),

]
