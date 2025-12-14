from rest_framework import serializers
from .models import Score , StudentAnswer
from .models import  *

class ScoreSerializer(serializers.ModelSerializer):
    count_correct = serializers.IntegerField(read_only=True)
    count_incorrect = serializers.IntegerField(read_only=True)
    passed = serializers.BooleanField(read_only=True)
    class Meta:
        model = Score
        fields = ['id', 'student', 'quiz','attempt' , 'score','passed' , 'total_questions', 'submitted_at' , 'count_correct', 'count_incorrect']

class StudentAnswerSerializer(serializers.ModelSerializer):
    student = serializers.HiddenField(default=serializers.CurrentUserDefault())
   

    class Meta:
        model = StudentAnswer
        fields = ['id', 'student', 'question', 'choice','attempt', 'type', 'submitted_at']





class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'text', 'is_correct']

class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True ,required=False)

    class Meta:
        model = Question
        fields = ['id', 'text', 'question_type','points', 'explanation', 'choices']

class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True , required=False)

    class Meta:
        model = Quiz
        fields = ['id','type', 'time_limit','passing_score', 'questions']

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', [])
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        keep_questions = []
        for question_data in questions_data:
            choices_data = question_data.pop('choices', [])
            question_id = question_data.get('id', None)
            if question_id: 
                question = Question.objects.get(id=question_id, quiz=instance)
                for attr, value in question_data.items():
                    setattr(question, attr, value)
                question.save()
            else: 
                question = Question.objects.create(quiz=instance, **question_data)
            keep_questions.append(question.id)
            question.choices.all().delete()
            for choice_data in choices_data:
                Choice.objects.create(question=question, **choice_data)
        instance.questions.exclude(id__in=keep_questions).delete()

        return instance


class GetQuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True , required=False)

    class Meta:
        model = Quiz
        fields = ['id','type', 'time_limit','passing_score', 'questions']
