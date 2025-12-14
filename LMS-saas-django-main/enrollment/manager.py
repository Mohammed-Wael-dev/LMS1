from django.db import models
from django.db.models import F, Value , Count, Prefetch, Q
from django.db.models.functions import Concat
class EnrollmentQuerySet(models.QuerySet):
    def get_count_and_hours(self, student):
        return self.filter(student=student).aggregate(
            courses_enrolled=models.Count("course", distinct=True),
            hours_learned=models.Sum("course__duration", output_field=models.DecimalField()),
            count_certificates=models.Count('student__certificates', distinct=True)
        )



class QuestionQuerySet(models.QuerySet):
    def get_count_reactions(self):
        return self.annotate(
            count_likes=Count("reactions" , filter=Q(reactions__type="like")),
            count_loves=Count("reactions" , filter=Q(reactions__type="love")),
            count_claps=Count("reactions" , filter=Q(reactions__type="clap")),
            
        )
    
    def info_question(self):
        from .models import Answer
        return self.select_related("lesson", "student").prefetch_related( Prefetch("answer", queryset=Answer.objects.get_count_reactions())).get_count_reactions()
    
class AnswerQuerySet(models.QuerySet):
    def get_count_reactions(self):
        return self.annotate(
            count_likes=Count("reactions" , filter=Q(reactions__type="like")),
            count_loves=Count("reactions" , filter=Q(reactions__type="love")),
            count_claps=Count("reactions" , filter=Q(reactions__type="clap")),
            
        )
    
class CertificateQuerySet(models.QuerySet):
    def get_info_courses(self):
        return self.annotate(
        name_instractor = Concat(
            F("course__instructor__first_name"),
            Value(" "),
            F("course__instructor__last_name"),
            output_field=models.CharField()
        )           , image_course = models.F("course__picture"),
            title_course = models.F("course__title")
        )
    
    def all_related(self):
        return self.select_related("student" , "course" , 'course__instructor')
    

    def get_info_certificates(self):
        return self.all_related().get_info_courses()
