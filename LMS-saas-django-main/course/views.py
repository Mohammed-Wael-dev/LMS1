# views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from shared.utilts import MyResponse
from .serializers import *
from .models import Course, Section, Lesson
from enrollment.models import Enrollment
from .filters import *
from django.db.models import Prefetch, F, Q, Count, Avg, Value, Max
from django.db.models.functions import Coalesce
from exam.models import Quiz, Score, Question, Choice, StudentAnswer
from account.permissions import IsInstructor
from exam.serializers import QuizSerializer, GetQuizSerializer
from shared.app_choices import AppChoices
from shared.app_utils import AppUtils

## Group courses
@api_view(['GET' , 'POST' , 'PATCH'])
@permission_classes([IsAuthenticated]) 
def group_course(request):

    if request.method == "GET":
        queryset = GroupCourse.objects.filter(student=request.user)
        groups = GroupCourseFilter(request.GET, queryset=queryset).qs
        serializer = GroupCourseSerializer(groups, many=True)
        return MyResponse({"data": serializer.data})

    if request.method == "POST":
        serializer = GroupCourseSerializer(data=request.data , context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return MyResponse({"data": serializer.data})
        return MyResponse({"error": serializer.errors})
    
    elif request.method == "PATCH":
        group_id = request.data.get("id")
        if not group_id:
            return MyResponse({"error": "Group ID is required for update"}, status=400)
        try:
            group = GroupCourse.objects.get(id=group_id)
        except GroupCourse.DoesNotExist:
            return MyResponse({"error": "Group not found"}, status=404)
        serializer = GroupCourseSerializer(group, data=request.data, partial=True , context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return MyResponse({"data": serializer.data})

## Refactor code  ------------------------------------------------------------
## Categories
@api_view(["GET"])
def get_categories(request):
    queryset = Category.objects.all().with_course_count()
    paginated_data = AppUtils.paginate_queryset(request, queryset, CategorySerializer)
    return AppUtils.response(data=paginated_data['data'], pagination=paginated_data['pagination'])

@api_view(["GET"])
def get_categories_filters(request):
    queryset = Category.objects.all().prefetch_related(Prefetch("subcategories", queryset=SubCategory.objects.all()))
    serializer = CategoryFiltersSerializer(queryset, many=True)
    return AppUtils.response(data=serializer.data)

## Sub Categories
@api_view(["GET"])
def get_sub_categories(request):
    queryset = SubCategory.objects.all()
    filterset = SubCategoryFilter(request.GET, queryset=queryset)
    if filterset.is_valid():
        queryset = filterset.qs
    serializer = SubCategorySerializer(queryset, many=True)
    return AppUtils.response(data=serializer.data)

# Level Courses
@api_view(['GET'])
def course_levels(request):
    levels = []
    for value, label in AppChoices.COURSE_LEVEL_CHOICES:
        levels.append({
            'id': value,
            'name': label
        })
    
    return AppUtils.response(data=levels)

## Courses
@api_view(["GET"])
def get_courses(request, pk=None):
    if pk:
        course = get_object_or_404(Course.objects.filter(is_published=True).all_related().get_info_with_students(), id=pk)
        serializer = CourseDetailSerializer(course)
        return MyResponse({"data": serializer.data})

    queryset = Course.objects.filter(is_published=True).all_related().get_info_with_students().with_instructor_info()
    filterset = CourseFilter(request.GET, queryset=queryset)
    if filterset.is_valid():
        queryset = filterset.qs
    paginated_data = AppUtils.paginate_queryset(request, queryset, CourseSerializer)
    return AppUtils.response(data=paginated_data['data'], pagination=paginated_data['pagination'])

@api_view(["GET"])
def get_courses_v2(request, pk=None):
    """
    API to get courses with advanced filters using Django Filter
    
    Parameters (all optional):
    - category_id: Filter by main category
    - subcategory_id: Filter by subcategory  
    - level: Course level (beginner, intermediate, advanced)
    - is_paid: Course type (true for paid courses, false for free)
    - search: Search in title, description, instructor name
    - most_popular: Sort by most popular (true)
    - highest_rated: Sort by highest rating (true)
    - newest: Sort by newest (true)
    - price_low_to_high: Sort by price from low to high (true)
    - price_high_to_low: Sort by price from high to low (true)
    - featured_courses: Get top 3 courses by highest enrollment (true)
    
    Usage examples:
    GET /api/course/v2/courses/?category_id=1&level=beginner&is_paid=false&most_popular=true
    GET /api/course/v2/courses/?search=python&highest_rated=true
    GET /api/course/v2/courses/?subcategory_id=2&price_low_to_high=true
    GET /api/course/v2/courses/?featured_courses=true
    """
    try:
        if pk:
            course = get_object_or_404(Course.objects.filter(is_published=True).all_related().get_info_with_students(), id=pk)
            serializer = CourseDetailSerializer(course, context={'request': request})
            return MyResponse({"data": serializer.data})

        queryset = Course.objects.filter(is_published=True).prefetch_related(
            Prefetch("enrollments"), 
            Prefetch("reviews")
        ).select_related("instructor").annotate(
            total_students=Count("enrollments__student", distinct=True),
            average_rating=Coalesce(Avg("reviews__rating"), Value(0.0)),
            total_reviews=Count("reviews", distinct=True) 
        )
        
        filterset = CourseFilter(request.GET, queryset=queryset)
        if filterset.is_valid():
            queryset = filterset.qs
        else:
            return AppUtils.response(error=f"Invalid filters: {filterset.errors}")
        
        paginated_data = AppUtils.paginate_queryset(request, queryset, CourseSerializerV2)
        return AppUtils.response(data=paginated_data['data'], pagination=paginated_data['pagination'])
        
    except Exception as e:
        return AppUtils.response(error=f"Error in getting courses: {str(e)}")

## Instructor courses
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsInstructor])
def course_instructors(request, course_id=None):
    if course_id:
        course = get_object_or_404(Course.objects.filter(instructor=request.user).get_instructor_course_stats(request.user), id=course_id)
        serializer = CourseDetailSerializer(course)
        return MyResponse({"data": serializer.data})
    
    course = Course.objects.filter(instructor= request.user).get_instructor_course_stats(request.user)
    serializer = CourseInstructorStatsSerializer(course, many=True)
    return MyResponse({"data": serializer.data})

@api_view(["POST", "PATCH" , 'DELETE'])
@permission_classes([IsAuthenticated, IsInstructor])
def course_crud(request, course_id=None):
    if request.method == "POST":
        serializer = CourseCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(instructor=request.user)
            return MyResponse({"data": serializer.data})
        return MyResponse({"error": serializer.errors} , status=400)

    elif request.method == "PATCH":
        course = get_object_or_404(Course, id=course_id, instructor=request.user)
        
        serializer = CourseCreateSerializer(course, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return MyResponse({"data": serializer.data})
        return MyResponse({"error": serializer.errors})
    
    if request.method == "DELETE":
        course = get_object_or_404(Course, id=course_id, instructor=request.user)
        course.delete()
        return MyResponse({"message": "Course deleted successfully."})

@api_view(["GET"])
def get_instructor_course(request, instructor_pk=None, course_pk=None):
    try:
        instructor = User.objects.get(pk=instructor_pk)
    except User.DoesNotExist:
        return Response({"error": "Instructor not found"}, status=404)
    course = Course.objects.get_instructor_courses(instructor, course_pk)
    serializer = CourseInstructorSerializer(course  , many=True)
    return Response({"data": serializer.data})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_course_enrollments(request , course_pk=None):
    courses = Course.objects.filter(id=course_pk).with_progress(request.user)
    serializer = CourseEnrollmentSerializer(courses, many=True)
    return MyResponse({"data": serializer.data})

## Student courses
@api_view(["GET"])
def get_student_courses(request, pk=None):
    search = request.query_params.get("search")
    status_filter = request.query_params.get("status")  # active, inactive, completed
    
    if pk:
        course = Course.objects.get_enrollment_students(search, status_filter).filter(id=pk).first()
        if not course:
            return MyResponse({"error": "Course not found"}, status=404)
        serializer = StudentCourseSerializer(course)
        return MyResponse({"data": serializer.data})

@api_view(["POST"])
@permission_classes([IsAuthenticated, IsInstructor])
def add_student_to_course(request, pk):
    course = get_object_or_404(Course, id=pk)
    
    # Check if user is the instructor of this course
    if course.instructor != request.user:
        return MyResponse({"error": "You can only add students to your own courses"}, status=403)
    
    serializer = AddStudentToCourseSerializer(data=request.data, context={'course': course})
        
    if serializer.is_valid():
        serializer.save()
        return MyResponse({"data": "Student added to course successfully"})
    
    return MyResponse({"error": serializer.errors}, status=400)

@api_view(["POST"])
@permission_classes([IsAuthenticated, IsInstructor])
def remove_student_from_course(request, pk):
    course = get_object_or_404(Course, id=pk)
    
    # Check if user is the instructor of this course
    if course.instructor != request.user:
        return MyResponse({"error": "You can only remove students from your own courses"}, status=403)
    
    serializer = RemoveStudentFromCourseSerializer(data=request.data, context={'course': course})
    
    if serializer.is_valid():
        serializer.save()
        return MyResponse({"data": "Student removed from course successfully"})
    return MyResponse({"error": serializer.errors}, status=400)

## Section
@api_view(["GET"])
def get_sections(request):
    if request.user.is_authenticated:
        user = request.user
    else:
        user = None

    # Check if include_lessons parameter is provided
    include_lessons = request.GET.get('include_lessons', 'true').lower() == 'true'
    
    # Build queryset based on include_lessons parameter
    if include_lessons:
        # Get course_id from the request
        course_id = request.GET.get('course')
        if course_id and user:
            # Use the enhanced prefetch with sequential access and progress
            queryset = Section.objects.select_related('course').with_sequential_access(
                user, course_id=course_id
            ).with_section_progress(user).prefetch_related(
                Prefetch(
                    'lessons',
                    queryset=Lesson.objects.with_sequential_access(
                        user, 
                        course_id=course_id
                    ).order_by('order')
                )
            ).order_by("order").with_lesson_count()
        else:
            queryset = Section.objects.all().order_by("order").with_section_progress(user).prefetch_related(
                Prefetch("lessons", queryset=Lesson.objects.order_by("order").with_progress(user))
            ).with_lesson_count()
    else:
        course_id = request.GET.get('course')
        if course_id and user:
            queryset = Section.objects.all().order_by("order").with_sequential_access(
                user, course_id=course_id
            ).with_section_progress(user).with_lesson_count()
        else:
            queryset = Section.objects.all().order_by("order").with_section_progress(user).with_lesson_count()
    
    filterset = SectionFilter(request.GET, queryset=queryset)
    if filterset.is_valid():
        queryset = filterset.qs


    if include_lessons:
        serializer_class = SectionSerializer
    else:
        serializer_class = SectionWithoutLessonsSerializer

    paginated_data = AppUtils.paginate_queryset(request, queryset, serializer_class)
    return AppUtils.response(data=paginated_data['data'], pagination=paginated_data['pagination'])

@api_view(["GET", "POST", "PATCH", "DELETE"]) 
@permission_classes([IsAuthenticated])
def create_or_update_or_delete_section(request, section_id=None):
    if request.method == "GET":
        if section_id:
            section = get_object_or_404(Section, id=section_id)
            serializer = SectionSerializer(section)
            return MyResponse({"data": serializer.data})
        else:
            queryset = Section.objects.all().order_by('order')
            serializer = SectionSerializer(queryset, many=True)
            return MyResponse({"data": serializer.data})

    if not request.user.is_instructor:
        return MyResponse(
            {"error": "Only instructors can perform this action"}
         
        )

    if request.method == "POST":
        serializer = SectionCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return MyResponse({"data": serializer.data})
        return MyResponse({"error": serializer.errors})

    elif request.method == "PATCH":
        if not section_id:
            return MyResponse({"error": "section_id is required for update"})
        
        section = get_object_or_404(Section, id=section_id)
        serializer = SectionCreateSerializer(section, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return MyResponse({"data": serializer.data})
        return MyResponse({"error": serializer.errors})
    
    

    elif request.method == "DELETE":
        if not section_id:
            return MyResponse({"error": "section_id is required for delete"})
        section = get_object_or_404(Section, id=section_id, course__instructor=request.user)
        section.delete()
        return MyResponse({"message": "Section deleted successfully."})

@api_view(["PUT"])
@permission_classes([IsAuthenticated, IsInstructor])
def reorder_sections(request):
    serializer = SectionReorderSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return MyResponse({"data": "Sections reordered successfully"})
    return MyResponse({"error": serializer.errors}, status=400)

## Lesson
@api_view(["GET", "POST", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def lesson_crud(request, lesson_id=None, section_id=None):
    if request.method == "GET":
        if lesson_id:
            lesson = get_object_or_404(Lesson, id=lesson_id)
            # Check if the student can access the lesson
            if not request.user.is_instructor:
                if not lesson.section.course.can_student_access_lesson(request.user, lesson):
                    return MyResponse({
                        "error": "You must complete the previous lesson first"
                    }, status=403)
            return MyResponse({"data": LessonSerializer(lesson, context={'request': request}).data})
        if not section_id:
            return MyResponse({"error": "section_id is required for get lessons"})
        
        # Use the enhanced prefetch for lessons
        course_id = request.GET.get('course_id')
        if course_id:
            queryset = Lesson.objects.filter(section_id=section_id).with_sequential_access(
                request.user, course_id=course_id
            ).order_by('order')
        else:
            queryset = Lesson.objects.filter(section_id=section_id).order_by('order')
        return MyResponse({"data": LessonSerializer(queryset, many=True, context={'request': request}).data})

    # Only instructors can perform CUD operations
    if not request.user.is_instructor:
        return MyResponse({"error": "Only instructors can perform this action"})

    if request.method == "POST":
        section_id = request.data.get('section_id')
        
        if not section_id:
            return MyResponse({"error": "section_id is required for create lesson"})
        
        section = get_object_or_404(Section, id=section_id, course__instructor=request.user)
        
        request_data = request.data.copy()
        request_data['section'] = section_id
        
        serializer = LessonSerializer(data=request_data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return MyResponse({"data": serializer.data})
        return MyResponse({"error": serializer.errors})

    elif request.method == "PATCH":
        if not lesson_id:
            return MyResponse({"error": "lesson_id is required for update"})
        
        lesson = get_object_or_404(Lesson, id=lesson_id, section__course__instructor=request.user)
        
        serializer = LessonSerializer(lesson, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return MyResponse({"data": serializer.data})
        return MyResponse({"error": serializer.errors})

    elif request.method == "DELETE":
        if not lesson_id:
            return MyResponse({"error": "lesson_id is required for delete"})
        lesson = get_object_or_404(Lesson, id=lesson_id, section__course__instructor=request.user)
        lesson.delete()
        return MyResponse({"message": "Lesson deleted successfully."})

@api_view(["PUT"])
@permission_classes([IsAuthenticated, IsInstructor])
def reorder_lessons(request):
    serializer = LessonReorderSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return MyResponse({"data": "Lessons reordered successfully"})
    return MyResponse({"error": serializer.errors}, status=400)


## Exam
@api_view(["POST", "PATCH" , "DELETE"])
@permission_classes([IsAuthenticated])
def create_or_update_exam_quiz(request , lesson_id):
    """
    Create, update, or delete quiz/exam/assessment for a lesson
    The quiz type is automatically determined from lesson's content_type
    """
    if not request.user.is_instructor:
        return MyResponse({"error": "Only instructors can perform this action"})
    
    try:
        lesson = Lesson.objects.get(id=lesson_id)
        quiz, created = Quiz.objects.get_or_create(lesson=lesson)
        
        # Set quiz type based on lesson content_type
        if lesson.content_type in ['quiz', 'exam', 'assessment']:
            quiz.type = lesson.content_type
            quiz.save()

        if request.method == "POST":
            # Override the type from request data with lesson content_type
            request_data = request.data.copy()
            request_data['type'] = lesson.content_type if lesson.content_type in ['quiz', 'exam', 'assessment'] else 'quiz'
            
            serializer = QuizSerializer(quiz, data=request_data)
            if serializer.is_valid():
                serializer.save()
                return MyResponse({"data": serializer.data})
            return MyResponse({"error": serializer.errors})
        
        elif request.method == "PATCH":
            # Override the type from request data with lesson content_type
            request_data = request.data.copy()
            request_data['type'] = lesson.content_type if lesson.content_type in ['quiz', 'exam', 'assessment'] else 'quiz'
            
            serializer = QuizSerializer(quiz, data=request_data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return MyResponse({"data": serializer.data})
            return MyResponse({"error": serializer.errors})
        
        elif request.method == "DELETE":
            quiz.delete()
            return MyResponse({"message": "quiz deleted successfully."})
            
    except Lesson.DoesNotExist:
        return MyResponse({"error": "Lesson not found"}, status=404)
    except Exception as e:
        return MyResponse({"error": f"Error processing quiz: {str(e)}"}, status=500)
    
@api_view(["GET"])
def git_quizs(request, lesson_pk):
    """
    Get quiz, exam, or assessment for a specific lesson
    The quiz type is determined based on the lesson's content_type
    """
    try:
        lesson = Lesson.objects.get(id=lesson_pk)
        quiz, created = Quiz.objects.get_or_create(lesson=lesson)
        
        # Update quiz type based on lesson content_type if it was just created or type is different
        if created or quiz.type != lesson.content_type:
            # Map lesson content_type to quiz type
            if lesson.content_type in ['quiz', 'exam', 'assessment']:
                quiz.type = lesson.content_type
                quiz.save()
        
        serializer = GetQuizSerializer(quiz)
        return MyResponse({"data": serializer.data})
    except Lesson.DoesNotExist:
        return MyResponse({"error": "Lesson not found"}, status=404)
    except Exception as e:
        return MyResponse({"error": f"Error retrieving quiz: {str(e)}"}, status=500)

## Best Sellers
@api_view(["GET"])
def get_categories_best_sellers(request):
    queryset = Course.objects.filter(is_published=True).with_best_seller_data()[:3]
    serializers =BestSellerSerializer(queryset , many=True)
    return MyResponse({"data": serializers.data})

## Assessment
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsInstructor])
def get_assessments(request):
    """
    API to get all assessment lessons for instructors only
    
    Query Parameters:
    - course_id (optional): Filter assessments by specific course ID
    
    Returns:
    - id: Assessment lesson ID
    - title: Assessment title
    - description: Assessment description
    - content_type: Always 'assessment'
    """
    try:
        # Get all lessons with content_type='assessment' from courses owned by the instructor
        assessments = Lesson.objects.filter(
            content_type='assessment',
            section__course__instructor=request.user
        ).select_related('section__course')
        
        # Filter by course_id if provided
        course_id = request.GET.get('course_id')
        if course_id:
            assessments = assessments.filter(section__course__id=course_id)
        
        # Order by creation date (newest first)
        assessments = assessments.order_by('-order')
        
        serializer = AssessmentSerializer(assessments, many=True)
        return AppUtils.response(data=serializer.data)
        
    except Exception as e:
        return AppUtils.response(error=f"Error retrieving assessments: {str(e)}")


def _get_latest_attempts_filter(quiz):
    """Helper function to get filter for latest attempts per student per question"""
    latest_attempts = StudentAnswer.objects.filter(
        question__quiz=quiz
    ).values('student', 'question').annotate(
        latest_attempt=Max('attempt')
    ).values('student', 'question', 'latest_attempt')
    
    # Create a filter for latest attempts
    latest_filters = Q()
    for attempt in latest_attempts:
        latest_filters |= Q(
            student_id=attempt['student'],
            question_id=attempt['question'],
            attempt=attempt['latest_attempt']
        )
    
    return latest_filters


def _get_choice_statistics(question, question_answers):
    """Helper function to build choice statistics for a question"""
    choices_data = []
    total_answers = question_answers.count()
    
    for choice in question.choices.all():
        answer_count = question_answers.filter(choice=choice).count()
        percentage = (answer_count / total_answers * 100) if total_answers > 0 else 0
        
        choices_data.append({
            'id': choice.id,
            'text': choice.text,
            'answer_count': answer_count,
            'percentage': round(percentage, 2)
        })
    
    return choices_data, total_answers


def _build_question_statistics(questions, student_answers):
    """Helper function to build statistics for all questions"""
    questions_data = []
    
    for question in questions:
        question_answers = student_answers.filter(question=question)
        choices_data, total_answers = _get_choice_statistics(question, question_answers)
        
        questions_data.append({
            'id': question.id,
            'text': question.text,
            'total_answers': total_answers,
            'choices': choices_data
        })
    
    return questions_data


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsInstructor])
def get_assessment_statistics(request, assessment_id):
    """
    API to get assessment statistics for instructors only
    
    Parameters:
    - assessment_id: UUID of the assessment lesson
    - latest_only (optional): If true, only get latest attempt per student (default: true)
    
    Returns:
    - id: Assessment lesson ID
    - title: Assessment title
    - description: Assessment description
    - total_questions: Total number of questions
    - total_students_attempted: Number of students who attempted the assessment
    - questions: Array of questions with statistics for each choice
    """
    try:
        # Get query parameters
        latest_only = request.GET.get('latest_only', 'true').lower() == 'true'
        
        # Get the assessment lesson and verify it belongs to the instructor
        assessment = get_object_or_404(
            Lesson.objects.select_related('section__course'),
            id=assessment_id,
            content_type='assessment',
            section__course__instructor=request.user
        )
        
        # Get the quiz associated with this assessment
        try:
            quiz = Quiz.objects.get(lesson=assessment)
        except Quiz.DoesNotExist:
            return AppUtils.response(error="No quiz found for this assessment", status=404)
        
        # Get all questions for this quiz with choices
        questions = Question.objects.filter(quiz=quiz).prefetch_related('choices')
        
        # Get student answers based on latest_only parameter
        if latest_only:
            latest_filters = _get_latest_attempts_filter(quiz)
            student_answers = StudentAnswer.objects.filter(latest_filters)
        else:
            student_answers = StudentAnswer.objects.filter(question__quiz=quiz)
        
        # Get total number of students who attempted this assessment
        total_students_attempted = student_answers.values('student').distinct().count()
        
        # Build statistics for all questions
        questions_data = _build_question_statistics(questions, student_answers)
        
        # Build the response data
        response_data = {
            'id': assessment.id,
            'title': assessment.title,
            'description': assessment.description,
            'total_questions': questions.count(),
            'total_students_attempted': total_students_attempted,
            'questions': questions_data
        }
        
        serializer = AssessmentStatisticsSerializer(response_data)
        return AppUtils.response(data=serializer.data)
        
    except Exception as e:
        return AppUtils.response(error=f"Error retrieving assessment statistics: {str(e)}")


## Last Course Progress
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_last_course_progress(request):
    """
    API to get the last course the user worked on with progress information
    
    Returns:
    - Course ID, title, picture
    - Category name
    - Progress: completed lessons / total lessons
    - Progress percentage
    - Last accessed time
    - Remaining hours to complete
    - Estimated completion time
    """
    try:
        # Get the last course the user accessed (based on last lesson progress)
        from enrollment.models import LessonProgress
        
        # Find the course with the most recent lesson progress
        last_progress = LessonProgress.objects.filter(
            student=request.user,
            watched=True
        ).select_related('lesson__section__course').order_by('-watched_at').first()
        
        if not last_progress:
            return AppUtils.response(data=None, status=200)
        
        # Get the course with progress information
        course = Course.objects.filter(
            id=last_progress.lesson.section.course.id,
            is_published=True
        ).with_progress(request.user).select_related(
            'sub_category__category'
        ).first()
        
        if not course:
            return AppUtils.response(data=None, error="Course not found")
        
        serializer = LastCourseProgressSerializer(course)
        return AppUtils.response(data=serializer.data)
        
    except Exception as e:
        return AppUtils.response(error=f"Error retrieving last course: {str(e)}")

