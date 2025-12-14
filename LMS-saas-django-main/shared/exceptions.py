from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError, PermissionDenied
from django.http import Http404
from rest_framework.exceptions import (
    ValidationError as DRFValidationError,
    NotAuthenticated,
    AuthenticationFailed
)
def custom_exception_handler(exc, context):
    # Call DRF's default handler first
    response = exception_handler(exc, context)

    if response is not None:
        return response

    # DRF ValidationError
    if isinstance(exc, DRFValidationError):
        return Response({"error": exc.detail}, status=status.HTTP_400_BAD_REQUEST)

    # Django ValidationError
    if isinstance(exc, ValidationError):
        return Response({"error": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

    # Not Found
    if isinstance(exc, Http404):
        return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    # Permission denied
    if isinstance(exc, PermissionDenied):
        return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

    # Authentication errors
    if isinstance(exc, NotAuthenticated):
        return Response({"error": "Authentication credentials were not provided."},
                        status=status.HTTP_401_UNAUTHORIZED)

    if isinstance(exc, AuthenticationFailed):
        return Response({"error": "Invalid authentication credentials."},
                        status=status.HTTP_401_UNAUTHORIZED)

    # Generic fallback
    return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)