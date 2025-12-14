from rest_framework.decorators import api_view , permission_classes
from rest_framework.permissions import IsAuthenticated
from .utilts import calc_score
from .filters import ScoreFilter
from shared.utilts import MyResponse
from .models import *
from .serializers import *
# Create your views here.

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def exam_quiz_view(request):
    answers_data = request.data
    print(answers_data)
    if not isinstance(answers_data, list):
        return MyResponse({"error": "Expected a list of answers"})
    
    serializer = StudentAnswerSerializer(data=answers_data, many=True, context={'request': request})
    serializer.is_valid(raise_exception=True)
    answers = StudentAnswer.objects.bulk_create([
        StudentAnswer(
            student=request.user,
            question=item["question"],
            choice=item["choice"],
            type=item["question"].quiz.type,
            attempt = item["attempt"]
        )
        for item in serializer.validated_data
    ])
    calc_score(answers)
    return MyResponse({"data": serializer.data})
   

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_student_answers(request):
    student = request.user
    queryset = Score.objects.filter(student=student).with_exam_info()
    filterset = ScoreFilter(request.GET, queryset=queryset)

    if filterset.is_valid():
        queryset = filterset.qs
    serializer = ScoreSerializer(queryset, many=True)
    return MyResponse({"data": serializer.data})