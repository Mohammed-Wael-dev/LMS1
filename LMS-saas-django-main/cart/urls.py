from django.urls import path
from . import views

urlpatterns = [
    path("get-cart/", views.get_cart, name="get_cart"),
    path("add-to-cart/", views.add_to_cart, name="add_to_cart"),
    path("remove-from-cart/", views.remove_from_cart, name="remove_from_cart"),
]
