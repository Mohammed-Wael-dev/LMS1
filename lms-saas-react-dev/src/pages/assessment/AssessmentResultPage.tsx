import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { API_ENDPOINTS } from "../../utils/constants";
import { get, post } from "../../api";
import { CheckCircle, XCircle, RefreshCw, ArrowRight, TrendingUp, Award, BookOpen, Lightbulb, Target } from "lucide-react";
import toast from "react-hot-toast";

interface AssessmentResult {
  level: string;
  score: number;
  total_questions: number;
  incorrect_answers: number;
  score_percentage: number;
  level_stats: {
    [key: string]: {
      total: number;
      correct: number;
    };
  };
  recommended_courses: any[];
  detailed_answers: Array<{
    question_id: string;
    question_text: string;
    selected_answer: string;
    correct_answer: string;
    is_correct: boolean;
    level: string;
    explanation_ar?: string;  // شرح مفصل من Gemini
  }>;
  advanced_tips?: Array<{  // نصائح متقدمة من Gemini
    title: string;
    description: string;
    type: string;
  }>;
  completed_at: string;
}

interface Recommendation {
  title: string;
  description: string;
  type: string;
}

interface RecommendationsResponse {
  recommendations: Recommendation[];
  level_code: string;
  level: string;
}

const AssessmentResultPage: React.FC = () => {
  const navigate = useNavigate();
  const [isResetting, setIsResetting] = useState(false);

  // Fetch assessment result
  const { data: result, isLoading, error } = useQuery<AssessmentResult>({
    queryKey: ["assessment-result"],
    queryFn: async () => {
      const res = await get(API_ENDPOINTS.assessmentResult);
      return res?.data || res;
    },
    retry: false,
  });

  // Use advanced_tips from result if available, otherwise fetch from API
  const advancedTips = result?.advanced_tips || [];
  
  // Fetch recommendations from Gemini (only if not in result)
  const { data: recommendationsData, isLoading: isLoadingRecommendations } = useQuery<RecommendationsResponse>({
    queryKey: ["assessment-recommendations"],
    queryFn: async () => {
      const res = await get(API_ENDPOINTS.assessmentRecommendations);
      return res?.data || res;
    },
    retry: false,
    enabled: !!result && (!result.advanced_tips || result.advanced_tips.length === 0), // Only fetch if not in result
  });
  
  // Combine tips from result and API
  const allRecommendations = advancedTips.length > 0 
    ? advancedTips 
    : (recommendationsData?.recommendations || []);

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await post(API_ENDPOINTS.resetAssessment, {});
      return res?.data || res;
    },
    onSuccess: () => {
      toast.success("تم إعادة تعيين الاختبار. يمكنك الآن إعادة الاختبار");
      navigate("/assessment");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "فشل إعادة تعيين الاختبار");
      setIsResetting(false);
    },
  });

  const handleRetakeAssessment = () => {
    setIsResetting(true);
    resetMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل النتيجة...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">لا توجد نتيجة</h2>
          <p className="text-gray-600 mb-6">لم تكمل الاختبار بعد. ابدأ الاختبار الآن!</p>
          <button
            onClick={() => navigate("/assessment")}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all duration-200"
          >
            ابدأ الاختبار
          </button>
        </div>
      </div>
    );
  }

  const levelColors = {
    beginner: "bg-green-100 text-green-800 border-green-300",
    intermediate: "bg-yellow-100 text-yellow-800 border-yellow-300",
    advanced: "bg-blue-100 text-blue-800 border-blue-300",
  };

  const levelLabels = {
    beginner: "مبتدئ",
    intermediate: "متوسط",
    advanced: "متقدم",
  };

  const levelDescriptions = {
    beginner: "أنت في المستوى المبتدئ. نوصي بالبدء بالكورسات الأساسية.",
    intermediate: "أنت في المستوى المتوسط. يمكنك البدء بالكورسات المتوسطة.",
    advanced: "ممتاز! أنت في المستوى المتقدم. يمكنك البدء بالكورسات المتقدمة.",
  };

  // Calculate chart data
  const chartData = [
    { label: "صحيحة", value: result.score, color: "bg-green-500", percentage: result.score_percentage },
    { label: "خاطئة", value: result.incorrect_answers, color: "bg-red-500", percentage: 100 - result.score_percentage },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">نتيجة اختبار تحديد المستوى</h1>
          <p className="text-gray-600">تم إكمال الاختبار بنجاح</p>
        </div>

        {/* Main Result Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="text-center mb-8">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">تم إكمال الاختبار بنجاح!</h2>
            <p className="text-gray-600 text-lg">
              علامتك: {result.score} / {result.total_questions} ({result.score_percentage}%)
            </p>
          </div>

          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 text-center border border-green-200">
              <div className="text-4xl font-bold text-green-600 mb-2">{result.score}</div>
              <div className="text-sm text-green-700 font-medium">إجابات صحيحة</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 text-center border border-purple-200">
              <div className="text-4xl font-bold text-purple-600 mb-2">{result.score_percentage}%</div>
              <div className="text-sm text-purple-700 font-medium">النسبة المئوية</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 text-center border border-red-200">
              <div className="text-4xl font-bold text-red-600 mb-2">{result.incorrect_answers}</div>
              <div className="text-sm text-red-700 font-medium">إجابات خاطئة</div>
            </div>
          </div>

          {/* Progress Bar Chart */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">توزيع الإجابات</h3>
            <div className="space-y-3">
              {chartData.map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>{item.label}</span>
                    <span>{item.value} ({item.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                    <div
                      className={`${item.color} h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                      style={{ width: `${item.percentage}%` }}
                    >
                      {item.percentage > 10 && (
                        <span className="text-white text-xs font-medium">{item.percentage.toFixed(0)}%</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Level Badge */}
          <div className="text-center mb-6">
            <div className={`inline-block px-8 py-4 rounded-lg border-2 ${levelColors[result.level as keyof typeof levelColors] || levelColors.beginner}`}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Award className="w-6 h-6" />
                <div className="text-2xl font-bold">
                  {levelLabels[result.level as keyof typeof levelLabels] || result.level}
                </div>
              </div>
              <div className="text-sm">
                {levelDescriptions[result.level as keyof typeof levelDescriptions]}
              </div>
            </div>
          </div>
        </div>

        {/* Level Statistics */}
        {result.level_stats && Object.keys(result.level_stats).length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              الإحصائيات حسب المستوى
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(result.level_stats).map(([level, stats]) => {
                const levelPercentage = stats.total > 0 ? (stats.correct / stats.total * 100) : 0;
                const levelLabel = level === 'beginner' ? 'مبتدئ' : level === 'intermediate' ? 'متوسط' : 'متقدم';
                return (
                  <div key={level} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-sm text-gray-600 mb-2">{levelLabel}</div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {stats.correct} / {stats.total}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${levelPercentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{levelPercentage.toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed Answers with Explanations */}
        {result.detailed_answers && result.detailed_answers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-600" />
              التصحيح المفصل للأسئلة
            </h2>
            <div className="space-y-4">
              {result.detailed_answers.map((answer, index) => (
                <div
                  key={answer.question_id}
                  className={`p-6 rounded-lg border-2 ${
                    answer.is_correct
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-gray-500">سؤال {index + 1}</span>
                        {answer.is_correct ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className={`text-sm font-semibold ${
                          answer.is_correct ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {answer.is_correct ? 'صحيح' : 'خاطئ'}
                        </span>
                      </div>
                      <p className="text-gray-900 font-medium mb-2">{answer.question_text}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600">
                          إجابتك: <span className="font-semibold">{answer.selected_answer}</span>
                        </span>
                        <span className="text-gray-600">
                          الإجابة الصحيحة: <span className="font-semibold text-green-700">{answer.correct_answer}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  {answer.explanation_ar && (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">💡 شرح مفصل:</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">{answer.explanation_ar}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Tips from Gemini */}
        {allRecommendations && allRecommendations.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-yellow-500" />
              نصائح وملء فجوات لمستواك ({levelLabels[result.level as keyof typeof levelLabels] || result.level})
            </h2>
            
            {/* Tips Section */}
            {allRecommendations.filter((r: any) => r.type === "Tips").length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-500" />
                  نصائح للتحسين
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allRecommendations
                    .filter((r: any) => r.type === "Tips")
                    .map((rec: any, index: number) => (
                      <div
                        key={index}
                        className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 hover:border-green-400 hover:shadow-md transition-all duration-200"
                      >
                        <h4 className="font-semibold text-gray-900 mb-2 text-lg">{rec.title}</h4>
                        <p className="text-gray-700 text-sm leading-relaxed">{rec.description}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Knowledge Gaps Section */}
            {allRecommendations.filter((r: any) => r.type === "Knowledge_Gaps").length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  ملء الفجوات المعرفية
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allRecommendations
                    .filter((r: any) => r.type === "Knowledge_Gaps")
                    .map((rec: any, index: number) => (
                      <div
                        key={index}
                        className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200 hover:border-blue-400 hover:shadow-md transition-all duration-200"
                      >
                        <h4 className="font-semibold text-gray-900 mb-2 text-lg">{rec.title}</h4>
                        <p className="text-gray-700 text-sm leading-relaxed">{rec.description}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Other Recommendations */}
            {allRecommendations.filter((r: any) => r.type !== "Tips" && r.type !== "Knowledge_Gaps").length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  استراتيجيات التعلم ومجالات التركيز
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allRecommendations
                    .filter((r: any) => r.type !== "Tips" && r.type !== "Knowledge_Gaps")
                    .map((rec: any, index: number) => (
                      <div
                        key={index}
                        className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border-2 border-purple-200 hover:border-purple-400 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Target className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-2 text-lg">{rec.title}</h4>
                            <p className="text-gray-700 text-sm leading-relaxed">{rec.description}</p>
                          </div>
                        </div>
                        {rec.type && (
                          <div className="mt-3 pt-3 border-t border-purple-200">
                            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                              {rec.type}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading Recommendations */}
        {isLoadingRecommendations && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mr-3"></div>
              <p className="text-gray-600">جاري تحميل النصائح المخصصة...</p>
            </div>
          </div>
        )}

        {/* Recommended Courses - 3 Courses */}
        {result.recommended_courses && result.recommended_courses.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-purple-600" />
              الكورسات الموصى بها لك حسب مستواك ({levelLabels[result.level as keyof typeof levelLabels] || result.level})
            </h2>
            <p className="text-gray-600 mb-6">اختر أحد الكورسات التالية لتبدأ رحلتك التعليمية:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {result.recommended_courses.slice(0, 3).map((course: any, index: number) => (
                <div
                  key={course.id}
                  className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200 hover:border-purple-500 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  {course.thumbnail_url && (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-40 object-cover rounded-lg mb-4"
                    />
                  )}
                  <div className="mb-3">
                    <span className="text-xs px-3 py-1 bg-purple-600 text-white rounded-full font-semibold">
                      كورس {index + 1}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 text-lg line-clamp-2">{course.title}</h3>
                  {course.subtitle && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.subtitle}</p>
                  )}
                  <div className="flex items-center justify-between mb-4">
                    {course.level && (
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded font-semibold">
                        {levelLabels[course.level as keyof typeof levelLabels] || course.level}
                      </span>
                    )}
                    {course.price !== undefined && (
                      <span className="text-sm font-bold text-gray-900">
                        {course.price === 0 ? "مجاني" : `${course.price} د.ع`}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/catalog/${course.id}`)}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                  >
                    <ArrowRight className="w-4 h-4" />
                    ابدأ الكورس
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons - Two Options: Go to Course or Retake Assessment */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">ماذا تريد أن تفعل الآن؟</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            {result.recommended_courses && result.recommended_courses.length > 0 ? (
              <button
                onClick={() => {
                  const firstCourse = result.recommended_courses[0];
                  if (firstCourse?.id) {
                    navigate(`/catalog/${firstCourse.id}`);
                  } else {
                    navigate("/catalog");
                  }
                }}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-bold hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl text-lg"
              >
                <BookOpen className="w-6 h-6" />
                التوجه للكورس الموصى به
              </button>
            ) : (
              <button
                onClick={() => navigate("/catalog")}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-bold hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl text-lg"
              >
                <BookOpen className="w-6 h-6" />
                تصفح جميع الكورسات
              </button>
            )}
            <button
              onClick={handleRetakeAssessment}
              disabled={isResetting}
              className="flex-1 bg-gray-200 text-gray-700 py-4 px-6 rounded-xl font-bold hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 text-lg shadow-lg hover:shadow-xl"
            >
              {isResetting ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-700"></div>
                  جاري إعادة التعيين...
                </>
              ) : (
                <>
                  <RefreshCw className="w-6 h-6" />
                  إعادة الاختبار
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentResultPage;

