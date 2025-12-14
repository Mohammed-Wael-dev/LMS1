import { Reply, Send } from "lucide-react";
import { API_ENDPOINTS } from "../../../utils/constants";
import { useCustomPatch, useCustomPost } from "../../../hooks/useMutation";
import { readUserFromStorage } from "../../../services/auth";
import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useForm, FormProvider } from "react-hook-form";
import QAListSkeleton from "../../resource-stats/QuestionsLoading";
import { formatDateTimeSimple } from "../../../utils/formatDateTime";
import ReactionGroup from "./Reaction";
import { useTranslation } from "react-i18next";

// Answer Form (Create/Edit)
const ReplyForm = React.memo(function ReplyForm({
  question,
  currentUser,
  editingAnswer, // when set edit mode
  onSubmitReply,
  onSubmitEdit,
  isSubmitting,
  onClose,
  t,
}: {
  question: Question;
  currentUser: User;
  editingAnswer: Answer | null;
  onSubmitReply: (payload: {
    questionId: number;
    text: string;
  }) => Promise<void>;
  onSubmitEdit: (payload: {
    id: number;
    question: number;
    text: string;
  }) => Promise<void>;
  isSubmitting: boolean;
  onClose: () => void;
  t: (key: string) => string;
}) {
  const isEdit = !!editingAnswer;

  const methods = useForm<{ reply: string }>({
    defaultValues: { reply: editingAnswer?.text ?? "" },
    shouldUnregister: true,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting: formSubmitting },
  } = methods;

  // Load answer text when edit target changes
  useEffect(() => {
    setValue("reply", editingAnswer?.text ?? "");
  }, [editingAnswer, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    const text = values.reply.trim();
    if (!text) return;

    if (isEdit && editingAnswer) {
      await onSubmitEdit({ id: editingAnswer.id, question: question.id, text });
      toast.success(t("qaSection.replyForm.answerUpdated"));
    } else {
      await onSubmitReply({ questionId: question.id, text });
      toast.success(t("qaSection.replyForm.replyPosted"));
    }

    reset();
    onClose();
  });

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={onSubmit}
        className="bg-gray-800 rounded-lg p-4 border border-gray-600"
      >
        <div className="flex items-center mb-3">
          {currentUser?.profile_image ? (
            <img
              src={currentUser?.profile_image}
              alt="You"
              className="w-6 h-6 rounded-full object-cover border border-gray-500 ltr:mr-2 rtl:ml-2"
            />
          ) : (
            <div className="w-6 h-6 bg-gray-600 ltr:mr-2 rtl:ml-2 rounded-full border border-gray-500 flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {currentUser?.first_name?.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-sm text-gray-300">
            {isEdit ? (
              t("qaSection.replyForm.editAnswer")
            ) : (
              <>
                {t("qaSection.replyForm.replyingTo")}{" "}
                {question?.student_?.first_name} {question?.student_?.last_name}
              </>
            )}
          </span>
        </div>

        <textarea
          placeholder={
            isEdit
              ? t("qaSection.replyForm.updateYourAnswer")
              : t("qaSection.replyForm.writeReply")
          }
          {...register("reply", { required: "Please write a reply." })}
          className="w-full h-24 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        {errors.reply && (
          <p className="mt-1 text-xs text-red-400">
            {errors.reply.message as string}
          </p>
        )}

        <div className="flex justify-end gap-3 mt-3">
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
          >
            {t("qaSection.replyForm.cancel")}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || formSubmitting}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {isEdit
              ? t("qaSection.replyForm.updateAnswer")
              : t("qaSection.replyForm.reply")}
          </button>
        </div>
      </form>
    </FormProvider>
  );
});

interface QASextionProps {
  lesson: string;
  questions: Question[];
  isLoading: boolean;
}

export default function QASection({
  lesson,
  questions,
  isLoading,
}: QASextionProps) {
  const currentUser: User = readUserFromStorage();
  const [openReplyId, setOpenReplyId] = useState<number | null>(null);
  const [answerEdit, setAnswerEdit] = useState<{
    questionId: number;
    answer: Answer;
  } | null>(null);
  const [questionEdit, setQuestionEdit] = useState<{
    id: number;
    text: string;
  } | null>(null);

  const { t, i18n } = useTranslation("coursePlayer");

  const { mutateAsync: askQuestion, isPending: askQuestionPending } =
    useCustomPost(API_ENDPOINTS.createQuestion, ["questions", lesson]);

  const { mutateAsync: editQuestion } = useCustomPatch(
    API_ENDPOINTS.updateQuestion,
    ["questions", lesson]
  );

  const { mutateAsync: createAnswer, isPending: createAnswerPending } =
    useCustomPost(API_ENDPOINTS.answers, ["questions", lesson]);

  const { mutateAsync: editAnswer } = useCustomPatch(API_ENDPOINTS.answers, [
    "questions",
    lesson,
  ]);

  // Create/Edit Question form
  const questionForm = useForm<{ qtext: string }>({
    defaultValues: { qtext: "" },
    shouldUnregister: true,
  });

  const {
    register: registerQuestion,
    handleSubmit: handleSubmitQuestion,
    reset: resetQuestion,
    setValue: setQuestionValue,
    formState: { errors: questionErrors, isSubmitting: questionSubmitting },
  } = questionForm;

  // When entering/leaving edit mode, sync the textarea
  useEffect(() => {
    if (questionEdit) {
      setQuestionValue("qtext", questionEdit.text);
    } else {
      resetQuestion({ qtext: "" });
    }
  }, [questionEdit, resetQuestion, setQuestionValue]);

  const onSubmitQuestion = handleSubmitQuestion(async ({ qtext }) => {
    const text = qtext.trim();
    if (!text) return;

    try {
      if (questionEdit) {
        // Edit Question
        const res = await editQuestion({ id: questionEdit.id, lesson, text });
        if (res?.status) {
          toast.success(t("qaSection.handleSubmitQuestion.questionUpdated"));
          setQuestionEdit(null);
          resetQuestion();
        }
      } else {
        // Create Question
        const res = await askQuestion({ lesson, text });
        if (res?.status) {
          toast.success(t("qaSection.handleSubmitQuestion.questionPosted"));
          resetQuestion();
        }
      }
    } catch (e: any) {
      toast.error(e?.message ?? t("qaSection.handleSubmitQuestion.error"));
    }
  });

  const cancelQuestionEdit = () => {
    setQuestionEdit(null);
    resetQuestion();
  };

  // Answer create/edit handlers
  const onSubmitReply = useCallback(
    async ({ questionId, text }: { questionId: number; text: string }) => {
      if (!text) return;
      await createAnswer({ question: questionId, text });
    },
    [createAnswer]
  );

  const onSubmitEditReply = useCallback(
    async ({
      id,
      question,
      text,
    }: {
      id: number;
      question: number;
      text: string;
    }) => {
      if (!text) return;
      await editAnswer({ id, question, text });
    },
    [editAnswer]
  );

  return (
    <div className="bg-gray-800 p-6 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Questions List */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-4">
              {t("qaSection.title")}
            </h3>

            {isLoading ? (
              <QAListSkeleton items={1} repliesPerQuestion={1} />
            ) : questions?.length > 0 ? (
              <div className="space-y-4">
                {questions.map((qa: Question) => {
                  const isMineQuestion = qa?.student_?.id === currentUser?.id;

                  return (
                    <div
                      key={qa?.id}
                      className="bg-gray-900 rounded-lg p-5 border border-gray-700"
                    >
                      <div className="flex items-start justify-between mb-3 group relative">
                        <div className="flex items-center gap-3">
                          {qa?.student_?.profile_image ? (
                            <img
                              src={qa?.student_?.profile_image}
                              alt={qa?.student_?.first_name}
                              className="w-8 h-8 rounded-full object-cover border-2 border-purple-500"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-purple-600 rounded-full border-2 border-purple-500 flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {qa?.student_?.first_name
                                  ?.charAt(0)
                                  .toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <h4 className="font-medium text-white hover:text-purple-300 cursor-pointer transition-colors">
                              {qa?.student_?.first_name}{" "}
                              {qa?.student_?.last_name}
                            </h4>
                            <p className="text-sm text-gray-400">
                              {formatDateTimeSimple(qa?.created_at, {
                                locale: i18n.language,
                                t: t,
                              })}
                            </p>
                          </div>
                        </div>

                        {isMineQuestion && (
                          <button
                            onClick={() => {
                              setQuestionEdit({ id: qa.id, text: qa.text });
                              document
                                .getElementById("qa-sidebar-form")
                                ?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg absolute top-0 right-0 group-hover:opacity-100 opacity-0 duration-300 transition-opacity"
                            title="Edit your question"
                          >
                            {t("qaSection.edit")}
                          </button>
                        )}
                      </div>

                      <div className="text-gray-300 mb-4 ltr:ml-11 rtl:mr-11 leading-relaxed">
                        <p>{qa?.text}</p>
                      </div>

                      {/* Actions */}
                      <div className="ltr:ml-11 rtl:mr-11 mb-4 flex items-center gap-4">
                        <ReactionGroup
                          subject={{ kind: "question", id: qa.id }}
                          countsFromServer={{
                            count_likes: qa.count_likes ?? 0,
                            count_loves: qa.count_loves ?? 0,
                            count_claps: qa.count_claps ?? 0,
                          }}
                          className="align-middle"
                        />
                        <button
                          onClick={() => {
                            // Opening "create reply" must close any edit state
                            setAnswerEdit(null);
                            setOpenReplyId((prev) =>
                              prev === qa.id ? null : qa.id
                            );
                          }}
                          className="flex items-center gap-1 text-sm text-gray-400 hover:text-purple-400 transition-colors"
                        >
                          <Reply className="w-4 h-4" />
                          <span>{t("qaSection.replyForm.reply")}</span>
                        </button>
                      </div>

                      {/* Replies */}
                      <div className="ltr:ml-11 rtl:mr-11 space-y-3">
                        {qa?.answer?.map((reply: Answer) => {
                          const isMyAnswer =
                            reply?.user_?.id === currentUser?.id;

                          const isEditingThisAnswer =
                            answerEdit?.questionId === qa.id &&
                            answerEdit?.answer?.id === reply.id;

                          return (
                            <div key={reply.id} className="w-full">
                              {isEditingThisAnswer ? (
                                <ReplyForm
                                  question={qa}
                                  currentUser={currentUser}
                                  editingAnswer={reply}
                                  onSubmitReply={onSubmitReply} // not used in edit path
                                  onSubmitEdit={onSubmitEditReply} // used here
                                  isSubmitting={createAnswerPending}
                                  onClose={() => {
                                    setAnswerEdit(null);
                                    setOpenReplyId(null);
                                  }}
                                  t={t}
                                />
                              ) : (
                                <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-purple-500 group relative">
                                  <div className="flex items-center w-full justify-between mb-2 relative">
                                    <div className="flex items-center gap-2">
                                      {reply?.user_?.profile_image ? (
                                        <img
                                          src={reply?.user_?.profile_image}
                                          alt={reply?.user_?.first_name}
                                          className="w-6 h-6 rounded-full object-cover border border-gray-500"
                                        />
                                      ) : (
                                        <div className="w-6 h-6 bg-gray-600 rounded-full border border-gray-500 flex items-center justify-center">
                                          <span className="text-white text-sm font-medium">
                                            {reply?.user_?.first_name
                                              ?.charAt(0)
                                              .toUpperCase()}
                                          </span>
                                        </div>
                                      )}
                                      <span className="font-medium text-white hover:text-purple-300 cursor-pointer transition-colors">
                                        {reply?.user_?.first_name}{" "}
                                        {reply?.user_?.last_name}
                                      </span>
                                      {reply?.user_?.is_instructor && (
                                        <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full font-medium">
                                          {t("qaSection.instructor")}
                                        </span>
                                      )}
                                    </div>

                                    <span className="text-xs text-gray-400">
                                      {formatDateTimeSimple(reply?.created_at, {
                                        locale: i18n.language,
                                        t: t,
                                      })}
                                    </span>

                                    {isMyAnswer && (
                                      <button
                                        onClick={() => {
                                          // FIX 1: do NOT open the create-reply box while editing
                                          setOpenReplyId(null);
                                          setAnswerEdit({
                                            questionId: qa.id,
                                            answer: reply,
                                          });
                                        }}
                                        className="absolute top-0 right-0 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium px-3 py-1 rounded-full shadow-lg group-hover:opacity-100 opacity-0 duration-300 transition-opacity"
                                        title="Edit your answer"
                                      >
                                        {t("qaSection.edit")}
                                      </button>
                                    )}
                                  </div>

                                  <div className="text-gray-300 text-sm leading-relaxed">
                                    {reply?.text}
                                  </div>

                                  <div className="flex items-center gap-4 mt-3">
                                    <ReactionGroup
                                      subject={{ kind: "answer", id: reply.id }}
                                      countsFromServer={{
                                        count_likes: reply.count_likes ?? 0,
                                        count_loves: reply.count_loves ?? 0,
                                        count_claps: reply.count_claps ?? 0,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Create only Answer Box */}
                      <div className="mt-4 ltr:ml-11 rtl:mr-11">
                        {openReplyId === qa.id &&
                          !(answerEdit && answerEdit.questionId === qa.id) && (
                            <ReplyForm
                              question={qa}
                              currentUser={currentUser}
                              editingAnswer={null}
                              onSubmitReply={onSubmitReply}
                              onSubmitEdit={onSubmitEditReply}
                              isSubmitting={createAnswerPending}
                              onClose={() => setOpenReplyId(null)}
                              t={t}
                            />
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center w-full bg-gray-900 rounded-lg p-5 border border-gray-700">
                <p className="text-center text-lg text-gray-400">
                  {t("qaSection.empty")}
                </p>
              </div>
            )}
          </div>

          {/* Ask / Edit Question (sidebar) */}
          <div className="lg:col-span-1">
            <form
              id="qa-sidebar-form"
              onSubmit={onSubmitQuestion}
              className="bg-gray-900 rounded-lg p-5 sticky top-4 border border-gray-700"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-white">
                  {questionEdit ? "Edit Question" : "Ask a Question"}
                </h4>
                {questionEdit && (
                  <button
                    type="button"
                    onClick={cancelQuestionEdit}
                    className="text-xs text-gray-300 hover:text-white underline"
                  >
                    {t("qaSection.cancelEdit")}
                  </button>
                )}
              </div>

              <textarea
                {...registerQuestion("qtext", {
                  required: t("qaSection.qForm.error"),
                })}
                placeholder={
                  questionEdit
                    ? t("qaSection.qForm.editPlaceholder")
                    : t("qaSection.qForm.addPlaceholder")
                }
                className="w-full h-32 p-3 bg-gray-800 border border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 text-sm"
              />
              {questionErrors.qtext && (
                <p className="mt-1 text-xs text-red-400">
                  {questionErrors.qtext.message as string}
                </p>
              )}

              <button
                type="submit"
                disabled={askQuestionPending || questionSubmitting}
                className="w-full mt-3 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center font-medium disabled:opacity-60"
              >
                <Send className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                {questionEdit
                  ? t("qaSection.qForm.editBtn")
                  : t("qaSection.qForm.addBtn")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
