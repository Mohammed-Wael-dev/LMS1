from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('account.urls')),
    path('api/course/', include('course.urls')),
    path('api/enrollments/', include('enrollment.urls')),
    path('api/exam/', include('exam.urls')),
    path('api/cart/', include('cart.urls')),
    path('api/core/', include('core.urls')),
    path('api/iraq-form/', include('iraq_form.urls')),
    path('api/tenant/', include('tenant.urls')),
    path("ckeditor5/", include('django_ckeditor_5.urls')),
]

# if settings.DEBUG:
#     import debug_toolbar
#     urlpatterns += [
#         path("__debug__/", include(debug_toolbar.urls)),
#         path("silk/", include("silk.urls", namespace="silk")),
#     ]
#     urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
