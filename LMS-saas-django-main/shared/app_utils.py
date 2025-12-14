from datetime import datetime

from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.shortcuts import _get_queryset
from rest_framework.exceptions import APIException
from rest_framework.request import Request
from rest_framework.response import Response

class AppUtils:
    @staticmethod
    def response(data=None, pagination=None, error=None, status=200):
        response_dict = {
            "status": error is None,
            "pagination": pagination if pagination else None, 
            "data": data,
            "error": error
        }

        if pagination is None:
            del response_dict["pagination"]

        return Response(response_dict, status=status if error is None else 400)
    
    @staticmethod
    def paginate_queryset(request: Request, queryset, serializer_class, extra_context=None):
        """
        Paginate a queryset and serialize the data.

        :param request: DRF request object.
        :param queryset: QuerySet to paginate.
        :param serializer_class: Serializer class to use for serialization.
        :param page_size: Number of items per page.
        :return: A dictionary with pagination information and serialized data.
        """
        page_size = int(request.GET.get("page_size", 10))
        page_number = int(request.query_params.get('page', 1))

        paginator = Paginator(queryset, page_size)
        try:
            items = paginator.page(page_number)
        except PageNotAnInteger:
            items = paginator.page(1)
        except EmptyPage:
            items = paginator.page(paginator.num_pages)

        total_pages = paginator.num_pages
        next_page_num = page_number + 1 if page_number < total_pages else None
        previous_page_num = page_number - 1 if page_number > 1 else 0

        context = {"request": request}
        if extra_context:
            context.update(extra_context)  # Update context with extra_context

        serializer = serializer_class(items, many=True, context=context)
        return {
            "pagination": {
                "next": next_page_num,
                "previous": previous_page_num,
                "count": paginator.count
            },
            "data": serializer.data
        }

    @staticmethod
    def get_first_error(errors, with_field=False):
        if isinstance(errors, dict):
            for field, error_messages in errors.items():
                if error_messages:
                    if with_field:
                        return f"{field} {error_messages[0]}"
                    else:
                        return f"{error_messages[0]}"
        elif isinstance(errors, str):
            return errors
        return None
    
    @staticmethod
    def get_path(instance, filename):
        # get the current timestamp
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')

        # split filename into name and extension
        name, ext = filename.rsplit('.', 1)

        # return the path with timestamp added to the name
        return "{0}/{1}_{2}.{3}".format(instance._meta.model_name, name, timestamp, ext)

    @staticmethod
    def get_object_or_404(klass, *args, **kwargs):
        queryset = _get_queryset(klass)
        try:
            return queryset.get(*args, **kwargs)
        except queryset.model.DoesNotExist:
            model_name = queryset.model.__name__
            raise CustomNotFound(detail=f"The {model_name} object matching the given query does not exist.")

    @staticmethod
    def get_tokens_for_user(user, platform: str):
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = RefreshToken.for_user(user)

        if platform == 'fxtweet':
            refresh['platform'] = 'fxtweet'
            refresh['version'] = user.token_version_fxtweet
            refresh['token_version'] = user.token_version_fxtweet  
        elif platform == 'metatrader':
            refresh['platform'] = 'metatrader'
            refresh['version'] = user.token_version_metatrader
            refresh['token_version'] = user.token_version_metatrader  

        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }


class CustomNotFound(APIException):
        status_code = 200
        default_detail = 'Not found.'
        default_code = 'not_found'

        def __init__(self, detail=None, code=None):
            if detail is not None:
                self.detail = {'error': detail, 'status': False, 'data': None}
            else:
                self.detail = {'error': self.default_detail, 'status': False, 'data': None}




