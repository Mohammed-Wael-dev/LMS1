# views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.db.models import Prefetch
from rest_framework import status
from .models import Enrollment , StudentReview , Reaction
from .serializers import *
from .filters import *
from shared.utilts import MyResponse
from django.shortcuts import get_object_or_404
from shared.app_utils import AppUtils

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enroll_course(request):
    serializer = EnrollmentSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return MyResponse({"data" : serializer.data})
    return MyResponse({"error":serializer.errors})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_enrollments(request):
    try:
        enrollments = Enrollment.objects.filter(student=request.user, course__is_published=True).select_related("course")
        serializer = DetilaEnrollmentSerializer(enrollments, many=True, context={'request': request})
        return AppUtils.response(data=serializer.data)
    except Exception as e:
        # If table doesn't exist (e.g., in public schema), return empty list
        return AppUtils.response(data=[])

@api_view(['GET'])
def get_reivews(request):
    if request.method == "GET":
        queryset =  StudentReview.objects.all().select_related("course" , 'student')
        filterset =  StudentReviewFilter(request.GET, queryset=queryset)
        if filterset.is_valid():
            query = filterset.qs
        serializer = StudentReviewSerializer(query, many=True)
        return MyResponse({"data": serializer.data})
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_reviews(request):
    if request.method == "GET":
        queryset =  StudentReview.objects.filter(student=request.user).select_related("course" , 'student').prefetch_related("like_course")
        filterset =  StudentReviewFilter(request.GET, queryset=queryset)
        if filterset.is_valid():
            query = filterset.qs
        serializer = StudentReviewSerializer(query, many=True)
        return MyResponse({"data": serializer.data})
    
@api_view(['POST' , 'PATCH'])
@permission_classes([IsAuthenticated])
def create_or_update_review(request):
    if request.method == "POST":
        # Check if user already has a review for this course
        course_id = request.data.get("course")
        if course_id:
            existing_review = StudentReview.objects.filter(course_id=course_id, student=request.user).first()
            if existing_review:
                return AppUtils.response(error="You have already reviewed this course. You can only review each course once.", status=400)

        serializer = StudentReviewSerializer(data=request.data , context={'request': request})
        if serializer.is_valid():
            serializer.save(student=request.user)  
            return AppUtils.response(data=serializer.data)
        return AppUtils.response(error=serializer.errors, status=400)
            
    
    elif request.method == "PATCH":
        review_id = request.data.get("id")
        if not review_id:
            return AppUtils.response(error="Review ID is required for update", status=400)
        try:
            review = StudentReview.objects.get(id=review_id, student=request.user) 

        except StudentReview.DoesNotExist:
            return AppUtils.response(error="Review not found or not yours", status=404)
        serializer = StudentReviewSerializer(review, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return AppUtils.response(data=serializer.data)
        return AppUtils.response(error=serializer.errors, status=400)
    

@api_view(['GET'])
def get_coursereview_likes(request):
    queryset = CourseLikeAspect.objects.all()
    filterset = CourseLikeAspectFilter(request.GET, queryset=queryset)
    if filterset.is_valid():
        queryset = filterset.qs
    serializer = CourseLikeAspectSerializer(queryset, many=True)
    return MyResponse({"data": serializer.data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_reviews_course_instructor(request):
    if request.method == "GET" and request.user.is_instructor:
        queryset = StudentReview.objects.filter(
            course__instructor=request.user
        ).select_related("course", 'student').order_by('-created_at')
        paginated_data = AppUtils.paginate_queryset(request, queryset, StudentReviewSerializer)
        return AppUtils.response(data=paginated_data['data'], pagination=paginated_data['pagination'])
    return AppUtils.response(error="Only instructors can access this endpoint")
    
@api_view(['GET', 'POST' , 'PATCH'])
@permission_classes([IsAuthenticated])
def lesson_note(request):
    
    if request.method == "GET":
        queryset = LessonNote.objects.filter(student=request.user).select_related("lesson")
        notes = LessonNoteFilter(request.GET, queryset=queryset).qs
        serializer = LessonNoteSerializer(notes, many=True, context={'request': request})
        return MyResponse({"data": serializer.data})
    
    elif request.method == "POST":
        serializer = LessonNoteSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return MyResponse({"data": serializer.data})
        return MyResponse({"error": serializer.errors})

    elif request.method == "PATCH":
        note_id = request.data.get("id")
        try:
            note = LessonNote.objects.get(id=note_id, student=request.user)
        except LessonNote.DoesNotExist:
            return MyResponse({"error": "Note not found"}, status=404)

        serializer = LessonNoteSerializer(note, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return MyResponse({"data": serializer.data})
        return MyResponse({"error": serializer.errors})
    
@api_view(['GET'])
def question(request):
    if request.method == "GET":
        # Optimize queries with select_related and prefetch_related
        queryset = Question.objects.select_related(
            'student',
            'lesson',
            'lesson__section',
            'lesson__section__course'
        ).prefetch_related(
            'reactions'
        ).info_question()
        
        question = QuestionFilter(request.GET, queryset=queryset).qs
        serializer = QuestionSerializer(question, many=True, context={'request': request})
        return AppUtils.response(data=serializer.data)
    
@api_view(['POST', 'PATCH'])
@permission_classes([IsAuthenticated])
def create_or_update_question(request):

    if request.method == "POST":
        serializer = QuestionSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save(student=request.user)
            return MyResponse({"data": serializer.data}, status=status.HTTP_201_CREATED)
        return MyResponse({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == "PATCH":
        question_id = request.data.get("id")
        if not question_id:
            return MyResponse({"error": "Question ID is required for update"}, status=400)
        try:
            question = Question.objects.get(id=question_id, student=request.user) 
        except Question.DoesNotExist:
            return MyResponse({"error": "Question not found or not yours"}, status=404)
        serializer = QuestionSerializer(question, data=request.data, partial=True , context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return MyResponse({"data": serializer.data})
        return MyResponse({"error": serializer.errors}, status=400)


@api_view(['POST', 'PATCH'])
@permission_classes([IsAuthenticated])
def create_or_update_answer(request):

    if request.method == "POST":
        serializer = AnswerSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return MyResponse({"data": serializer.data})
        return MyResponse({"error": serializer.errors})
    
    if request.method == "PATCH":
        answer_id = request.data.get("id")
        if not answer_id:
            return MyResponse({"error": "Answer ID is required for update"}, status=400)
        try:
            answer = Answer.objects.get(id=answer_id)
        except Answer.DoesNotExist:
            return MyResponse({"error": "Answer not found"}, status=404)
        serializer = AnswerSerializer(answer, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return MyResponse({"data": serializer.data})
        return MyResponse({"error": serializer.errors})
    

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_lesson_progress(request):
    serializer = LessonProgressSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return AppUtils.response(error=serializer.errors)

    instance = serializer.save()
    created = serializer.context.get("created", False)

    if not created:
        return AppUtils.response(data="Already completed")

    return AppUtils.response(data=LessonProgressSerializer(instance, context={'request': request}).data)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_certificates(request):
    """
    Get all certificates for the authenticated student
    """
    certificates = Certificate.objects.filter(student=request.user).select_related('course', 'course__instructor')
    serializer = CertificateSerializer(certificates, many=True, context={'request': request})
    return AppUtils.response(data=serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_reaction(request):
    data = request.data.copy()
    reaction_type = data.get("type")
    user = request.user
    question_id = data.get("question")
    answer_id = data.get("answer")

    def _is_empty(value):
        return value is None or (isinstance(value, str) and value.strip().lower() in {"", "null", "none"})

    has_question = not _is_empty(question_id)
    has_answer = not _is_empty(answer_id)
    
    # Check if user already has a reaction
    existing_reaction = None
    if has_question:
        existing_reaction = Reaction.objects.filter(user=user, question_id=question_id).first()
    elif has_answer:
        existing_reaction = Reaction.objects.filter(user=user, answer_id=answer_id).first()
    
    # If user wants to remove reaction
    if _is_empty(reaction_type):
        if not (has_question or has_answer):
            return AppUtils.response(error="Question or answer is required to remove reaction.")
        
        if existing_reaction:
            existing_reaction.delete()
            return AppUtils.response(data="Reaction removed successfully")
        else:
            return AppUtils.response(error="No reaction found to remove")
    
    # If user wants to create/update reaction
    if existing_reaction:
        # If same reaction type, remove it (toggle behavior)
        if existing_reaction.type == reaction_type:
            existing_reaction.delete()
            return AppUtils.response(data={
                "message": "Reaction removed successfully",
                "has_reaction": False,
                "reaction_type": None
            })
        else:
            # Update existing reaction with new type
            existing_reaction.type = reaction_type
            existing_reaction.save()
            serializer = ReactionSerializer(existing_reaction)
            return AppUtils.response(data={
                "reaction": serializer.data,
                "has_reaction": True,
                "reaction_type": existing_reaction.type
            })
    else:
        # Create new reaction
        serializer = ReactionSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            reaction = serializer.save()
            return AppUtils.response(data={
                "reaction": serializer.data,
                "has_reaction": True,
                "reaction_type": reaction.type
            })
        return AppUtils.response(error=serializer.errors)


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def enroll_course_instructor(request):
    user = request.user

    # السماح فقط للطلاب أو المدرسين
    if not (user.is_student or user.is_instructor):
        return MyResponse({"error": "Only students or instructors can enroll"}, status=403)

    course_id = request.data.get("course")
    if not course_id:
        return MyResponse({"error": "Course ID is required"}, status=400)

    course = get_object_or_404(Course, id=course_id)

    # -------------------- POST = إضافة --------------------
    if request.method == "POST":
        serializer = EnrollmentAllowSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return MyResponse({"data": serializer.data})
        return MyResponse({"error": serializer.errors}, status=400)

    # -------------------- DELETE = إزالة --------------------
    elif request.method == "DELETE":
        student_id = request.data.get("student") or user.id

        enrollment = Enrollment.objects.filter(course=course, student_id=student_id).first()
        if not enrollment:
            return MyResponse({"error": "Enrollment not found"}, status=404)

        enrollment.delete()
        return MyResponse({"message": "Enrollment deleted successfully"})
