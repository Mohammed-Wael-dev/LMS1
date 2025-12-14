from django.urls import path
from .views import webview, dashboard_stats, top_reviews, settings, settings


urlpatterns = [
    path("webview/", webview, name="webview"),
    path("dashboard_stats/", dashboard_stats, name="dashboard_stats"),
    path("top_reviews/", top_reviews, name="top_reviews"),
    path("settings/", settings, name="settings"),
]
