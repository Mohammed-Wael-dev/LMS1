from django.urls import path

from .views import *

urlpatterns = [
    path("governorates/", get_governorates, name="iraq_governorates"),
    path("voting-centers/", get_voting_centers, name="iraq_voting_centers"),
    path("submissions/", submit_iraq_form, name="iraq_form_submission"),
    path("observer-applications/", submit_iraq_observer_form, name="iraq_observer_application"),
    # Analytics endpoints
    path("track-visit/", track_page_visit, name="track_page_visit"),
    path("analytics/", analytics_dashboard, name="iraq_analytics_dashboard"),
]
