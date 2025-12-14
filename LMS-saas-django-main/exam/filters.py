from django_filters import rest_framework as filters
from .models import *

class ScoreFilter(filters.FilterSet):

    class Meta:
        model = Score
        fields = ['quiz' ,'attempt']
