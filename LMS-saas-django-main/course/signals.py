from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.postgres.search import SearchVector

from .models import Course

@receiver(post_save, sender=Course)
def update_search_vector(sender, instance, **kwargs):
    """
    Update the search_vector field after saving a Course.
    This allows full-text search on title, subtitle, and description.
    Weights: title (A), subtitle (B), description (C).
    Config: english (for stemming/normalization).
    """
    vector = (
        SearchVector("title", weight="A", config="english") +
        SearchVector("subtitle", weight="B", config="english") +
        SearchVector("description", weight="C", config="english")
    )

    Course.objects.filter(id=instance.id).update(search_vector=vector)
