#!/usr/bin/env python
"""Create Student and Instructor accounts"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    django.setup()
except Exception as e:
    print(f"Error setting up Django: {e}")
    sys.exit(1)

from account.models import User, Student, Instructor

# Create Student account
student_email = 'student@gmail.com'
student_password = 'student123'
student_first_name = 'Student'
student_last_name = 'User'

# Create Instructor account
instructor_email = 'instructor@gmail.com'
instructor_password = 'instructor123'
instructor_first_name = 'Instructor'
instructor_last_name = 'User'

try:
    # Create or update Student
    if User.objects.filter(email=student_email).exists():
        user = User.objects.get(email=student_email)
        user.set_password(student_password)
        user.first_name = student_first_name
        user.last_name = student_last_name
        user.is_active = True
        user.is_verified = True
        user.is_student = True
        user.is_instructor = False
        user.save()
        student = Student.objects.get(email=student_email)
        print('[OK] Student account already exists. Updated!')
    else:
        # Create user first, then convert to Student
        user = User.objects.create_user(
            email=student_email,
            password=student_password,
            first_name=student_first_name,
            last_name=student_last_name,
            is_active=True,
            is_verified=True,
            is_student=True,
            is_instructor=False
        )
        student = Student.objects.get(email=student_email)
        print('[OK] Student account created successfully!')
    
    print(f'  Email: {student.email}')
    print(f'  Name: {student.first_name} {student.last_name}')
    print(f'  Is Student: {student.is_student}')
    print(f'  Is Active: {student.is_active}')
    print(f'  Is Verified: {student.is_verified}')
    
    # Create or update Instructor
    if User.objects.filter(email=instructor_email).exists():
        user = User.objects.get(email=instructor_email)
        user.set_password(instructor_password)
        user.first_name = instructor_first_name
        user.last_name = instructor_last_name
        user.is_active = True
        user.is_verified = True
        user.is_instructor = True
        user.is_student = False
        user.save()
        instructor = Instructor.objects.get(email=instructor_email)
        print('\n[OK] Instructor account already exists. Updated!')
    else:
        # Create user first, then convert to Instructor
        user = User.objects.create_user(
            email=instructor_email,
            password=instructor_password,
            first_name=instructor_first_name,
            last_name=instructor_last_name,
            is_active=True,
            is_verified=True,
            is_instructor=True,
            is_student=False
        )
        instructor = Instructor.objects.get(email=instructor_email)
        print('\n[OK] Instructor account created successfully!')
    
    print(f'  Email: {instructor.email}')
    print(f'  Name: {instructor.first_name} {instructor.last_name}')
    print(f'  Is Instructor: {instructor.is_instructor}')
    print(f'  Is Active: {instructor.is_active}')
    print(f'  Is Verified: {instructor.is_verified}')
    
    print('\n' + '='*50)
    print('[OK] Done! Login credentials:')
    print('='*50)
    print('\nStudent Account:')
    print(f'  Email: {student_email}')
    print(f'  Password: {student_password}')
    print('\nInstructor Account:')
    print(f'  Email: {instructor_email}')
    print(f'  Password: {instructor_password}')
    print('\n' + '='*50)
    
except Exception as e:
    print(f'[ERROR] Error: {str(e)}')
    import traceback
    traceback.print_exc()
    sys.exit(1)

