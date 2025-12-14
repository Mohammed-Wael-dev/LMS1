# course/utils.py

import base64
import uuid
import binascii
import mimetypes
import hashlib
import time
from pathlib import Path
from typing import Optional, Tuple  # <-- مهم لبايثون 3.9
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils.text import get_valid_filename
from rest_framework import serializers
from PIL import Image


class Base64FileHandler:
    """
    أداة لتحويل base64 (أو data URL) إلى ContentFile آمن مع اسم ملف فريد.
    """

    def __init__(self, *, max_size_mb: int = 50, add_random_token: bool = True):
        self.max_size = max_size_mb * 1024 * 1024
        self.add_random_token = add_random_token

    def attach_file(
        self,
        validated_data: dict,
        *,
        base64_key: str = "file_base64",
        name_key: str = "file_name",
        target_key: str = "file",
    ) -> dict:
        """
        إذا وجد base64، يضيف validated_data[target_key] = ContentFile جاهز.
        ويحذف المفاتيح المؤقتة من validated_data.
        """
        file_base64 = validated_data.pop(base64_key, None)
        file_name = validated_data.pop(name_key, None)

        if not file_base64:
            return validated_data

        try:
            mime, b64 = self._parse_data_url(file_base64)
            file_bytes = self._strict_b64decode(b64)

            if not file_bytes:
                raise serializers.ValidationError("Uploaded file is empty.")

            if len(file_bytes) > self.max_size:
                raise serializers.ValidationError(
                    "File too large (max {} MB).".format(self.max_size // (1024 * 1024))
                )

            # معالجة الصور باستخدام PIL
            processed_bytes = self._process_image_if_needed(file_bytes, mime)
            
            # إنشاء اسم معقد للصورة
            complex_name = self._generate_complex_image_name(file_name, mime, file_bytes)
            complex_name = default_storage.get_available_name(complex_name)

            django_file = ContentFile(processed_bytes, name=complex_name)
            validated_data[target_key] = django_file
            return validated_data

        except serializers.ValidationError:
            raise
        except Exception as e:
            raise serializers.ValidationError("Invalid base64 file data: {}".format(e))

    # ---------- Helpers ----------
    @staticmethod
    def _parse_data_url(s: str) -> Tuple[Optional[str], str]:
        """
        يرجع (mime, base64_part). يقبل plain base64 أو data URL.
        """
        if s.startswith("data:"):
            header, b64 = s.split(",", 1)
            # header مثل: data:image/png;base64
            parts = header.split(";")[0].split(":", 1)
            mime = parts[1] if len(parts) == 2 else None
            return mime, b64
        return None, s

    @staticmethod
    def _strict_b64decode(b64: str) -> bytes:
        try:
            return base64.b64decode(b64, validate=True)
        except (binascii.Error, ValueError):
            raise serializers.ValidationError("Invalid base64 content.")

    def _unique_name(self, preferred_name: Optional[str], mime: Optional[str]) -> str:
        """
        يولّد اسم آمن وفريد مع الحفاظ على الامتداد (إن وجد)
        أو استنتاجه من MIME، وإلا .bin
        """
        if preferred_name:
            preferred_name = get_valid_filename(Path(preferred_name).name)
            stem = Path(preferred_name).stem
            ext = Path(preferred_name).suffix
            if not ext:
                ext = self._ext_from_mime(mime) or ".bin"
        else:
            stem = uuid.uuid4().hex[:12]
            ext = self._ext_from_mime(mime) or ".bin"

        if self.add_random_token:
            token = uuid.uuid4().hex[:6]
            return "{}-{}{}".format(stem, token, ext)
        return "{}{}".format(stem, ext)

    @staticmethod
    def _ext_from_mime(mime: Optional[str]) -> str:
        if not mime:
            return ""
        ext = mimetypes.guess_extension(mime)
        # تطبيع لبعض الحالات الشائعة
        return {".jpe": ".jpg", ".jpeg": ".jpg"}.get(ext, ext or "")

    def _process_image_if_needed(self, file_bytes: bytes, mime: Optional[str]) -> bytes:
        """
        معالجة الصور باستخدام PIL لضمان الجودة والأمان
        """
        if not mime or not mime.startswith('image/'):
            return file_bytes
        
        try:
            # فتح الصورة باستخدام PIL
            image = Image.open(BytesIO(file_bytes))
            
            # تحويل إلى RGB إذا كانت الصورة في وضع آخر
            if image.mode in ('RGBA', 'LA', 'P'):
                # إنشاء خلفية بيضاء للصور الشفافة
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            elif image.mode != 'RGB':
                image = image.convert('RGB')
            
            # تحسين جودة الصورة
            image = image.convert('RGB')
            
            # حفظ الصورة مع ضغط مناسب
            output = BytesIO()
            image.save(output, format='JPEG', quality=85, optimize=True)
            return output.getvalue()
            
        except Exception as e:
            # في حالة فشل المعالجة، إرجاع البيانات الأصلية
            return file_bytes

    def _generate_complex_image_name(self, preferred_name: Optional[str], mime: Optional[str], file_bytes: bytes) -> str:
        """
        إنشاء اسم معقد للصورة باستخدام hash و timestamp و random
        """
        # إنشاء hash من محتوى الملف
        file_hash = hashlib.sha256(file_bytes).hexdigest()[:16]
        
        # timestamp دقيق
        timestamp = str(int(time.time() * 1000000))[-10:]  # آخر 10 أرقام من microsecond timestamp
        
        # random UUID
        random_part = uuid.uuid4().hex[:8]
        
        # الحصول على الامتداد
        if preferred_name:
            ext = Path(preferred_name).suffix
            if not ext:
                ext = self._ext_from_mime(mime) or ".jpg"
        else:
            ext = self._ext_from_mime(mime) or ".jpg"
        
        # تطبيع الامتداد
        if ext.lower() in ['.jpe', '.jpeg']:
            ext = '.jpg'
        elif ext.lower() == '.png':
            ext = '.png'
        else:
            ext = '.jpg'  # افتراضي
        
        # إنشاء الاسم المعقد
        complex_name = f"img_{file_hash}_{timestamp}_{random_part}{ext}"
        
        return complex_name
