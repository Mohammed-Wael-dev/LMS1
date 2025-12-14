from django.template.loader import render_to_string
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from decouple import config


# ------------------- Send verification register email ------------------- #
def send_verification_register(user, form_url):
    title = 'Verification Email'

    try:
        html_content = render_to_string(
            'emails/verification_email.html',
            {
                'title': title,
                'user': user,
                'form_url': form_url,
            }
        )

        message = Mail(
            from_email=config('DEFAULT_FROM_EMAIL'),
            subject=title,
            to_emails=[user.email],
            html_content=html_content
        )

        sg = SendGridAPIClient(config('SEND_GRID'))
        response = sg.send(message)

    except Exception as e:
        print(f"Error sending verification email: {e}")


# ------------------- Send password reset email ------------------- #
def send_password_reset(user, form_url):
    title = 'Password Reset Request'

    try:
        html_content = render_to_string(
            'emails/password_reset_email.html',
            {
                'title': title,
                'user': user,
                'form_url': form_url,
            }
        )

        message = Mail(
            from_email=config('DEFAULT_FROM_EMAIL'),
            subject=title,
            to_emails=[user.email],
            html_content=html_content
        )

        print(f"SendGrid API Key: {config('SEND_GRID')}")

        sg = SendGridAPIClient(config('SEND_GRID'))
        response = sg.send(message)

    except Exception as e:
        print(f"Error sending password reset email: {e}")

    if hasattr(e, 'message'):
        print(f"SendGrid response: {e.message}")
