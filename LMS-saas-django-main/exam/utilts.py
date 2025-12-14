from django.db.models import Sum
from .models import Score, StudentAnswer


def calc_score(answers):
    processed_attempts = set()

    for answer in answers:
        if answer.type not in {"exam", "quiz"}:
            continue

        key = (answer.student_id, answer.question.quiz_id, answer.attempt)
        if key in processed_attempts:
            continue
        processed_attempts.add(key)

        quiz = answer.question.quiz
        total_questions = quiz.questions.count()
        total_points = quiz.questions.aggregate(total=Sum("points"))["total"] or 0

        score_obj, _ = Score.objects.update_or_create(
            student_id=answer.student_id,
            quiz=quiz,
            attempt=answer.attempt,
            defaults={"total_questions": total_questions},
        )

        if not total_points:
            score_value = 0
        else:
            attempt_answers = StudentAnswer.objects.filter(
                student_id=answer.student_id,
                question__quiz_id=quiz.id,
                attempt=answer.attempt,
            ).select_related("choice", "question")

            correct_points = sum(
                ans.question.points
                for ans in attempt_answers
                if ans.choice.is_correct
            )

            score_value = min(int(round((correct_points / total_points) * 100)), 100)

        score_obj.score = score_value
        score_obj.total_questions = total_questions
        score_obj.save()
