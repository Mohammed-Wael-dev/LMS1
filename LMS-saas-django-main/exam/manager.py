from django.db import models
from django.db.models import Count, Q, F, Case, When, BooleanField


class ScoreQuerySet(models.QuerySet):
    def with_exam_info(self):
        return self.annotate(
            count_correct=Count(
                "student__quiz_answers",
                filter=Q(
                    student__quiz_answers__choice__is_correct=True,
                    student__quiz_answers__question__quiz=F("quiz"),
                    student__quiz_answers__attempt=F("attempt"),
                ),
                distinct=True,
            ),
            count_incorrect=Count(
                "student__quiz_answers",
                filter=Q(
                    student__quiz_answers__choice__is_correct=False,
                    student__quiz_answers__question__quiz=F("quiz"),
                    student__quiz_answers__attempt=F("attempt"),
                ),
                distinct=True,
            ),
            passed=Case(
                When(score__gte=F("quiz__passing_score"), then=True),
                default=False,
                output_field=BooleanField(),
            ),
        )
