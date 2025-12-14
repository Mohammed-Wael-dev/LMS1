from faker import Faker
from rest_framework.response import Response
from rest_framework.request import Request
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
import uuid
from django.db import connection
# from tenant.models import Client  # Removed - tenant system disabled
from typing import Optional
import random
from rest_framework import serializers
from rest_framework import mixins , viewsets , status


def compress_image(self):
        from PIL import Image as ImageService
        if self.image:  
            image_path = self.image.path
            img = ImageService.open(image_path) 
            width, height = img.size
            new_size = (width // 2, height // 2)
            resized_img = img.resize(new_size)
            resized_img.save(image_path, optimize=True, quality=50)


def MyResponse(dict, status=status.HTTP_200_OK):
    if dict.get("data") is not None:
        dict["status"] = True
        dict["detail"] = None
    elif dict.get("error") is not None:
        dict["status"] = False
        dict["data"] = None
    else:
        dict["status"] = False
        dict["data"] = None
    return Response(dict, status=status)


def paginate_queryset(request: Request, queryset, serializer_class, extra_context=None):

    page_size = int(request.GET.get("page_size", 15))
    if page_size >= 20:
        page_size = 20

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
        "next": next_page_num,
        "previous": previous_page_num,
        "count": paginator.count,
        "data": serializer.data
    }


def generate_random_email():
    return f"user_{uuid.uuid4().hex[:8]}@example.com"


def get_current_schema_api_key() -> Optional[str]:
    """
    Returns the api_key_daftra of the current tenant schema.
    Note: Tenant system disabled - this function returns None
    """
    # Tenant system disabled
    return None


def generate_otp():
    return f"{random.randint(0, 9999):04d}"



def validate_phone_number_user( value):
        valid_prefixes = ('078', '079', '077')
        if not value.isdigit():
            raise serializers.ValidationError("Phone number must contain digits only.")
        if len(value) != 10:
            raise serializers.ValidationError("Phone number must be exactly 10 digits long.")
        if not value.startswith(valid_prefixes):
            raise serializers.ValidationError("Phone number must start with a valid Jordanian prefix: 078, 079, or 077.")
        return value




class BaseModelViewSet(mixins.CreateModelMixin,
                         mixins.RetrieveModelMixin,
                         mixins.UpdateModelMixin,
                         mixins.DestroyModelMixin,
                         mixins.ListModelMixin,
                         viewsets.GenericViewSet):

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        data = paginate_queryset(
            request=request,
            queryset=queryset,
            serializer_class=self.get_serializer_class(),
        )

        return MyResponse(data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return MyResponse({"data": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return MyResponse({"data": serializer.data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return MyResponse({"data": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return MyResponse({"data": True})
    


def get_file_extension_from_filename(filename):
    """استخراج امتداد الملف من اسم الملف"""
    if not filename or '.' not in filename:
        return '.bin'
    
    # Extract extension and convert to lowercase
    extension = '.' + filename.split('.')[-1].lower()
    
    # Validate common extensions
    valid_extensions = {
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.txt', '.rtf', '.csv', '.json', '.xml', '.html', '.htm',
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp',
        '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v',
        '.mp3', '.wav', '.ogg', '.aac', '.flac',
        '.zip', '.rar', '.7z', '.tar', '.gz'
    }
    
    return extension if extension in valid_extensions else '.bin'

def get_file_extension(file_bytes):
    """تحديد امتداد الملف بناءً على signature (magic bytes)"""
    if not file_bytes:
        return '.bin'
    
    # PDF files
    if file_bytes[:4] == b'%PDF':
        return '.pdf'
    
    # ZIP-based formats (DOCX, XLSX, PPTX, etc.)
    elif file_bytes[:2] == b'PK':
        return '.zip'  # Default to zip, could be docx, xlsx, etc.
    
    # Microsoft Office legacy formats
    elif file_bytes[:4] == b'\xD0\xCF\x11\xE0':
        return '.doc'  # Could be .doc, .xls, .ppt
    
    # Image formats
    elif file_bytes[:3] == b'\xFF\xD8\xFF':
        return '.jpg'
    elif file_bytes[:4] == b'\x89PNG':
        return '.png'
    elif file_bytes[:6] in [b'GIF87a', b'GIF89a']:
        return '.gif'
    elif file_bytes[:2] == b'BM':
        return '.bmp'
    
    # Video formats
    elif file_bytes[:4] == b'\x00\x00\x00\x18ftypmp42':
        return '.mp4'
    elif file_bytes[:4] == b'\x00\x00\x00\x20ftypM4V':
        return '.m4v'
    
    # Audio formats
    elif file_bytes[:3] == b'ID3':
        return '.mp3'
    elif file_bytes[:4] == b'OggS':
        return '.ogg'
    
    # Text formats
    elif file_bytes[:4] == b'<?xml':
        return '.xml'
    elif file_bytes[:2] == b'{\n' or file_bytes[:2] == b'{ ':
        return '.json'
    
    # Default fallback
    else:
        return '.bin'   

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