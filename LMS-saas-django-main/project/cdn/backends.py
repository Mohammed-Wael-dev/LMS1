#  add this code inside backends.py
from storages.backends.s3boto3 import S3Boto3Storage
import os


class StaticRootS3Boto3Storage(S3Boto3Storage):
    location = 'static'


class MediaRootS3Boto3Storage(S3Boto3Storage):
    location = 'media'

class CkeditorRootS3Boto3Storage(S3Boto3Storage):
    location = os.getenv('CKEDITOR_LOCATION')
    default_acl = 'public-read'
    file_overwrite = False

    @property
    def querystring_auth(self):
        return False