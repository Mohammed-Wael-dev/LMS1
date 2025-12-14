#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Create sample assessment questions for placement test
"""
import os
import sys
import django
import io

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    django.setup()
except Exception as e:
    print(f"Error setting up Django: {e}")
    sys.exit(1)

from account.models import AssessmentQuestion

# Sample questions covering different levels
questions_data = [
    {
        'question_text': 'ما هي لغة البرمجة الأكثر استخداماً لتطوير تطبيقات الويب؟',
        'option_a': 'Python',
        'option_b': 'JavaScript',
        'option_c': 'Java',
        'option_d': 'C++',
        'correct_answer': 'B',
        'level_weight': 'beginner',
        'order': 1
    },
    {
        'question_text': 'ما هو الـ Framework الأكثر شعبية لتطوير تطبيقات React؟',
        'option_a': 'Angular',
        'option_b': 'Vue.js',
        'option_c': 'Next.js',
        'option_d': 'Svelte',
        'correct_answer': 'C',
        'level_weight': 'intermediate',
        'order': 2
    },
    {
        'question_text': 'ما هو الـ Design Pattern المستخدم لإدارة الحالة في تطبيقات React الكبيرة؟',
        'option_a': 'Singleton Pattern',
        'option_b': 'Observer Pattern',
        'option_c': 'State Management Pattern',
        'option_d': 'Factory Pattern',
        'correct_answer': 'C',
        'level_weight': 'advanced',
        'order': 3
    },
    {
        'question_text': 'ما هو الـ HTTP Method المستخدم لإنشاء مورد جديد في REST API؟',
        'option_a': 'GET',
        'option_b': 'POST',
        'option_c': 'PUT',
        'option_d': 'DELETE',
        'correct_answer': 'B',
        'level_weight': 'beginner',
        'order': 4
    },
    {
        'question_text': 'ما هو الفرق بين let و const في JavaScript؟',
        'option_a': 'لا يوجد فرق',
        'option_b': 'let يمكن إعادة تعيينه، const لا يمكن',
        'option_c': 'const أسرع من let',
        'option_d': 'let يستخدم فقط في الحلقات',
        'correct_answer': 'B',
        'level_weight': 'beginner',
        'order': 5
    },
    {
        'question_text': 'ما هو الـ Hook في React المستخدم لإدارة الحالة في المكونات الوظيفية؟',
        'option_a': 'useEffect',
        'option_b': 'useState',
        'option_c': 'useContext',
        'option_d': 'useReducer',
        'correct_answer': 'B',
        'level_weight': 'intermediate',
        'order': 6
    },
    {
        'question_text': 'ما هو الـ Algorithm المستخدم لتحسين أداء قاعدة البيانات؟',
        'option_a': 'Bubble Sort',
        'option_b': 'Indexing',
        'option_c': 'Linear Search',
        'option_d': 'Binary Tree',
        'correct_answer': 'B',
        'level_weight': 'intermediate',
        'order': 7
    },
    {
        'question_text': 'ما هو الـ SOLID Principle الذي ينص على أن الكلاس يجب أن يكون مفتوحاً للامتداد ومغلقاً للتعديل؟',
        'option_a': 'Single Responsibility',
        'option_b': 'Open/Closed Principle',
        'option_c': 'Liskov Substitution',
        'option_d': 'Interface Segregation',
        'correct_answer': 'B',
        'level_weight': 'advanced',
        'order': 8
    },
    {
        'question_text': 'ما هو الـ CSS Framework الأكثر استخداماً لتطوير واجهات المستخدم الحديثة؟',
        'option_a': 'Bootstrap',
        'option_b': 'Tailwind CSS',
        'option_c': 'Material-UI',
        'option_d': 'Bulma',
        'correct_answer': 'B',
        'level_weight': 'beginner',
        'order': 9
    },
    {
        'question_text': 'ما هو الـ Design Pattern المستخدم لضمان وجود نسخة واحدة فقط من الكلاس؟',
        'option_a': 'Factory Pattern',
        'option_b': 'Observer Pattern',
        'option_c': 'Singleton Pattern',
        'option_d': 'Strategy Pattern',
        'correct_answer': 'C',
        'level_weight': 'advanced',
        'order': 10
    },
]

def create_questions():
    # Set UTF-8 encoding for stdout
    if sys.stdout.encoding != 'utf-8':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    created_count = 0
    updated_count = 0
    
    for q_data in questions_data:
        question, created = AssessmentQuestion.objects.update_or_create(
            question_text=q_data['question_text'],
            defaults={
                'option_a': q_data['option_a'],
                'option_b': q_data['option_b'],
                'option_c': q_data['option_c'],
                'option_d': q_data['option_d'],
                'correct_answer': q_data['correct_answer'],
                'level_weight': q_data['level_weight'],
                'order': q_data['order'],
                'is_active': True
            }
        )
        
        if created:
            created_count += 1
            print(f"[OK] Created question {q_data['order']}")
        else:
            updated_count += 1
            print(f"[UPDATED] Updated question {q_data['order']}")
    
    print("\n" + "="*50)
    print("Summary:")
    print(f"  Created: {created_count} questions")
    print(f"  Updated: {updated_count} questions")
    print(f"  Total active questions: {AssessmentQuestion.objects.filter(is_active=True).count()}")
    print("="*50)

if __name__ == "__main__":
    print("Creating assessment questions...")
    print("="*50)
    create_questions()
    print("\n[OK] Done!")
