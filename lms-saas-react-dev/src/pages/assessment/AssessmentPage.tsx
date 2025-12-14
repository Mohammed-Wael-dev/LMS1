import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { API_ENDPOINTS } from "../../utils/constants";
import { get, post } from "../../api";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

/* ================= TYPES ================= */

interface Option {
  key: string;
  value: string;
}

interface Question {
  id: string;
  text: string;
  options: Option[];
  order: number;
}

interface Answer {
  question_id: string;
  selected_answer: string;
}

/* ================= COMPONENT ================= */

const AssessmentPage: React.FC = () => {
  const navigate = useNavigate();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ================= FETCH QUESTIONS ================= */

  const { data: questions, isLoading, isError, error, refetch } = useQuery<Question[]>({
    queryKey: ["assessment-questions"],
    queryFn: async () => {
      try {
        console.log("[Assessment] Fetching questions from:", API_ENDPOINTS.assessmentQuestions);
        const res = await get(API_ENDPOINTS.assessmentQuestions);
        
        // تسجيل الاستجابة للتحقق
        console.log("[Assessment] Full API Response:", JSON.stringify(res, null, 2));
        
        // التحقق من بنية الاستجابة - دعم أشكال مختلفة
        let questionsData = null;
        
        // الحالة 1: res.data.data (البنية القياسية)
        if (res?.data?.data && Array.isArray(res.data.data)) {
          questionsData = res.data.data;
          console.log("[Assessment] Questions found in res.data.data:", questionsData.length);
        }
        // الحالة 2: res.data مباشرة (إذا كانت array)
        else if (res?.data && Array.isArray(res.data)) {
          questionsData = res.data;
          console.log("[Assessment] Questions found in res.data (direct):", questionsData.length);
        }
        // الحالة 3: res مباشرة (إذا كانت array)
        else if (Array.isArray(res)) {
          questionsData = res;
          console.log("[Assessment] Questions found in res (direct):", questionsData.length);
        }
        // الحالة 4: res.data.data.data (بنية متداخلة)
        else if (res?.data?.data?.data && Array.isArray(res.data.data.data)) {
          questionsData = res.data.data.data;
          console.log("[Assessment] Questions found in res.data.data.data:", questionsData.length);
        }
        
        // إذا كانت الاستجابة تحتوي على error
        if (res?.data?.error || res?.data?.status === false) {
          const errorMsg = res?.data?.error || "فشل تحميل الأسئلة";
          console.error("[Assessment] API Error:", errorMsg);
          throw new Error(errorMsg);
        }
        
        // إذا لم نجد الأسئلة
        if (!questionsData || !Array.isArray(questionsData) || questionsData.length === 0) {
          console.error("[Assessment] No questions found in response. Full response:", res);
          throw new Error("لم يتم العثور على أسئلة في الاستجابة");
        }
        
        console.log("[Assessment] Successfully loaded", questionsData.length, "questions");
        return questionsData;
      } catch (err: any) {
        console.error("[Assessment] Error fetching questions:", err);
        console.error("[Assessment] Error details:", {
          message: err?.message,
          response: err?.response?.data,
          status: err?.response?.status
        });
        throw err;
      }
    },
    retry: 1,
    retryDelay: 2000,
    staleTime: 0,
    gcTime: 0, // cacheTime renamed to gcTime in newer versions
    refetchOnWindowFocus: false,
  });

  /* ================= SUBMIT ================= */

  const submitMutation = useMutation({
    mutationFn: async (answersData: Answer[]) => {
      const res = await post(API_ENDPOINTS.submitAssessment, {
        answers: answersData,
      });
      return res.data.data;
    },
    onSuccess: () => {
      setIsSubmitting(false);
      toast.success("تم إنهاء التقييم بنجاح");
      // Navigate to result page instead of showing result inline
      navigate("/assessment-result", { replace: true });
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      const errorMessage = error?.response?.data?.error || error?.message || "فشل إرسال التقييم";
      toast.error(errorMessage);
    },
  });

  /* ================= HANDLERS ================= */

  const handleAnswerSelect = (qid: string, key: string) => {
    setAnswers((p) => ({ ...p, [qid]: key }));
  };

  const handleSubmit = () => {
    if (!questions) return;

    const allAnswered = questions.every((q) => answers[q.id]);
    if (!allAnswered) {
      toast.error("الرجاء الإجابة على جميع الأسئلة");
      return;
    }

    setIsSubmitting(true);

    submitMutation.mutate(
      questions.map((q) => ({
        question_id: q.id,
        selected_answer: answers[q.id],
      }))
    );
  };

  /* ================= LOADING ================= */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل الأسئلة...</p>
          <p className="text-sm text-gray-500 mt-2">يرجى الانتظار</p>
        </div>
      </div>
    );
  }

  /* ================= ERROR ================= */

  if (isError || !questions || (Array.isArray(questions) && questions.length === 0)) {
    const errorMessage = error
      ? error?.response?.data?.error || 
        error?.response?.data?.data?.error ||
        error?.message || 
        "حدث خطأ أثناء تحميل الأسئلة. يرجى المحاولة مرة أخرى."
      : "لا توجد أسئلة متاحة في الوقت الحالي.";
    
    console.error("[Assessment] Error state:", {
      isError,
      hasQuestions: !!questions,
      questionsLength: questions?.length,
      error: error?.message,
      errorResponse: error?.response?.data
    });
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            فشل تحميل الأسئلة
          </h2>
          <p className="text-gray-700 mb-6">
            {errorMessage}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                console.log("[Assessment] Retrying...");
                refetch();
              }}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                  جاري التحميل...
                </>
              ) : (
                "إعادة المحاولة"
              )}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
            >
              تحديث الصفحة
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================= RESULT PAGE ================= */
  // Note: Result is now shown in AssessmentResultPage, not here

  /* ================= QUESTIONS ================= */

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            لا توجد أسئلة
          </h2>
          <p className="text-gray-600 mb-6">
            لا توجد أسئلة متاحة في الوقت الحالي.
          </p>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];

  if (!question) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            خطأ في تحميل السؤال
          </h2>
          <button
            onClick={() => setCurrentQuestion(0)}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            العودة للبداية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>السؤال {currentQuestion + 1} من {questions.length}</span>
            <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-4">
          {question.text}
        </h2>

        <div className="space-y-3 mb-6">
          {question.options && question.options.length > 0 ? (
            question.options.map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleAnswerSelect(question.id, opt.key)}
                className={`w-full p-3 border rounded text-left transition-all ${
                  answers[question.id] === opt.key
                    ? "border-purple-600 bg-purple-50 shadow-md"
                    : "border-gray-300 hover:border-purple-400"
                }`}
              >
                <strong>{opt.key}.</strong> {opt.value}
              </button>
            ))
          ) : (
            <p className="text-gray-500">لا توجد خيارات متاحة لهذا السؤال</p>
          )}
        </div>

        <div className="flex justify-between">
          <button
            disabled={currentQuestion === 0}
            onClick={() => setCurrentQuestion((q) => Math.max(0, q - 1))}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
          >
            السابق
          </button>

          {currentQuestion < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestion((q) => Math.min(questions.length - 1, q + 1))}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              التالي
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {isSubmitting ? "جارٍ الإرسال..." : "إنهاء التقييم"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentPage;
