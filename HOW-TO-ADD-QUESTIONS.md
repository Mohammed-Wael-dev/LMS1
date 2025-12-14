# كيفية إضافة أسئلة الاختبار / How to Add Assessment Questions

## الطريقة الأولى: من لوحة التحكم Django Admin (الأسهل) ⭐

### الخطوات:

1. **افتح لوحة التحكم:**
   ```
   http://localhost:8000/admin/
   ```

2. **سجّل الدخول:**
   - Email: `admin@gmail.com`
   - Password: `123`

3. **انتقل إلى:**
   - **Account** → **Assessment questions**

4. **أضف سؤال جديد:**
   - اضغط على **"Add Assessment question"**
   - املأ الحقول:
     - **Question text**: نص السؤال
     - **Option A, B, C, D**: الخيارات الأربعة
     - **Correct answer**: الإجابة الصحيحة (A, B, C, أو D)
     - **Level weight**: مستوى السؤال (beginner, intermediate, advanced)
     - **Order**: ترتيب السؤال (1, 2, 3...)
     - **Is active**: ✅ (لتفعيل السؤال)

5. **احفظ السؤال**

### مثال:
```
Question text: ما هي لغة البرمجة الأكثر استخداماً لتطوير تطبيقات الويب؟
Option A: Python
Option B: JavaScript
Option C: Java
Option D: C++
Correct answer: B
Level weight: beginner
Order: 1
Is active: ✅
```

---

## الطريقة الثانية: استخدام السكريبت التلقائي 🚀

### تشغيل السكريبت:

```powershell
cd LMS-saas-django-main
.\venv\Scripts\Activate.ps1
python create_assessment_questions.py
```

هذا السكريبت سينشئ 10 أسئلة تلقائياً.

---

## الطريقة الثالثة: من خلال Python Shell

```powershell
cd LMS-saas-django-main
.\venv\Scripts\Activate.ps1
python manage.py shell
```

ثم في الـ shell:

```python
from account.models import AssessmentQuestion

# إنشاء سؤال جديد
question = AssessmentQuestion.objects.create(
    question_text="ما هو الـ Framework الأكثر شعبية لتطوير تطبيقات React؟",
    option_a="Angular",
    option_b="Vue.js",
    option_c="Next.js",
    option_d="Svelte",
    correct_answer="C",
    level_weight="intermediate",
    order=1,
    is_active=True
)

print(f"تم إنشاء السؤال: {question.question_text[:50]}...")
```

---

## ملاحظات مهمة:

1. **عدد الأسئلة**: يجب أن يكون لديك على الأقل 10 أسئلة نشطة
2. **التوزيع**: يُنصح بتوزيع الأسئلة على المستويات:
   - 3-4 أسئلة للمبتدئين
   - 3-4 أسئلة للمتوسطين
   - 3-4 أسئلة للمتقدمين
3. **الترتيب**: استخدم حقل `order` لترتيب الأسئلة
4. **التفعيل**: تأكد من تفعيل السؤال (`is_active=True`)

---

## عرض الأسئلة الموجودة:

```powershell
cd LMS-saas-django-main
.\venv\Scripts\Activate.ps1
python manage.py shell
```

```python
from account.models import AssessmentQuestion

# عرض جميع الأسئلة
questions = AssessmentQuestion.objects.filter(is_active=True).order_by('order')
for q in questions:
    print(f"{q.order}. {q.question_text[:50]}... [{q.level_weight}]")
```

---

## حذف أو تعديل سؤال:

1. من لوحة التحكم: `http://localhost:8000/admin/account/assessmentquestion/`
2. اختر السؤال
3. عدّل أو احذف

