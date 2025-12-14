from django.db import models
from account.models import User
from course.models import Course
# Create your models here.

class Cart(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="cart"
    )
    courses = models.ManyToManyField(
        Course,
        related_name="carts",
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Cart({self.user})"