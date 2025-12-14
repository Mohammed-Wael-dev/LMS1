from django.db.models.signals import post_save
from django.dispatch import receiver
from decouple import config

from shared.sendgrid import send_password_reset, send_verification_register

from .models import *

@receiver(post_save, sender=TokensVerfication)
def handle_token_email(sender, instance, created, **kwargs):
    print(f"[Signal Triggered] Token Type: {instance.token_type}")

    if not created:
        return

    user = instance.user
    base_url = config('FRONTEND_BASE_URL')

    print(f"Base URL: {base_url}")

    try:
        if instance.token_type == 'signup':
            verification_url = f"{base_url}/verify-account/{instance.token}/"
            send_verification_register(user, verification_url)
            print(f"[Signup] Sent verification email with link: {verification_url}")

        elif instance.token_type == 'password_reset':
            verification_url = f"{base_url}/reset-password/{instance.token}/"
            send_password_reset(user, verification_url)
            print(f"[Password Reset] Sent reset email with link: {verification_url}")

    except Exception as e:
        print(f"[Error] While sending {instance.token_type} email: {e}")