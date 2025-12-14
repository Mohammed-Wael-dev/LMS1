import os

AWS_ACCESS_KEY_ID = 'DO801KWCWKWJKDDBKGV2'
AWS_SECRET_ACCESS_KEY = 'fTiMnsT1y3rqs/zy2dcqhdzpYKasRadrQyL4Xq1/aT8'
AWS_STORAGE_BUCKET_NAME = 'shabab'
AWS_S3_REGION_NAME = 'fra1'  # e.g., 'us-west-1'
AWS_S3_ENDPOINT_URL = 'https://fra1.digitaloceanspaces.com'  # e.g., 'https://fra1.digitaloceanspaces.com'

# Optional settings
AWS_S3_FILE_OVERWRITE = False  # Avoid overwriting files with same name
AWS_DEFAULT_ACL = None         # Required for some buckets


AWS_S3_OBJECT_PARAMETERS = {
    "CacheControl": "max-age=86400",
}

AWS_LOCATION = "fra1"

AWS_DEFAULT_ACL = 'public-read'

DEFAULT_FILE_STORAGE = "project.cdn.backends.MediaRootS3Boto3Storage"
STATICFILES_STORAGE = "project.cdn.backends.StaticRootS3Boto3Storage"






