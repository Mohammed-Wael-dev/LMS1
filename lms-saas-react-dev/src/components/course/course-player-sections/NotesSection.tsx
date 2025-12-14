import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useCustomQuery } from "../../../hooks/useQuery";
import { useCustomPatch, useCustomPost } from "../../../hooks/useMutation";
import { API_ENDPOINTS } from "../../../utils/constants";
import handleErrorAlerts from "../../../utils/showErrorMessages";
import { formatDateTimeSimple } from "../../../utils/formatDateTime";
import { useTranslation } from "react-i18next";

interface LessonNotesProps {
  currentLessonId: string;
  notes: string;
  setNotes: React.Dispatch<React.SetStateAction<string>>;
  title: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  setNotesCount?: React.Dispatch<React.SetStateAction<number>>;
}

export default function LessonNotes({
  currentLessonId,
  notes,
  setNotes,
  title,
  setTitle,
  setNotesCount,
}: LessonNotesProps) {
  const [savedNotes, setSavedNotes] = useState<{ [key: string]: string }>({});
  const [editNoteValue, setEditNoteValue] = useState("");
  const [editNoteTitle, setEditNoteTitle] = useState("");
  const [editNote, setEditNote] = useState(null);
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation("coursePlayer");
  // GET Notes
  const { data } = useCustomQuery(
    `/enrollments/lesson-notes/?lesson=${currentLessonId}`,
    ["lesson-notes", currentLessonId],
    undefined,
    !!currentLessonId
  );
  const notesData = data?.data;
  // POST Notes
  const { mutateAsync: addNotes } = useCustomPost(API_ENDPOINTS.lessonNotes, [
    "post-lesson-notes",
  ]);
  //PATCH Notes
  const { mutateAsync: editNotes } = useCustomPatch(API_ENDPOINTS.lessonNotes, [
    "patch-lesson-notes",
  ]);
  const handleSaveNotes = async () => {
    try {
      await addNotes({ lesson: currentLessonId, title: title, content: notes });
      setSavedNotes((prev) => ({
        ...prev,
        [currentLessonId]: notes,
      }));
      queryClient.invalidateQueries({
        queryKey: ["lesson-notes", currentLessonId],
      });
      setNotes("");
      setTitle("");
    } catch (error: any) {
      handleErrorAlerts(
        error.response?.data?.error || t("notesSection.handleSave.error")
      );
    }

    toast.success(t("notesSection.handleSave.success"));
    console.log("Notes saved for lesson:", currentLessonId, notes);
  };
  const handleEditNotes = async (id: string) => {
    try {
      const editData = {
        id: id,
        title: editNoteTitle,
        content: editNoteValue,
      };
      await editNotes(editData);
      setSavedNotes((prev) => ({
        ...prev,
        [currentLessonId]: notes,
      }));
      queryClient.invalidateQueries({
        queryKey: ["lesson-notes", currentLessonId],
      });
      setEditNoteValue("");
      setEditNoteTitle("");
      setEditNote(null);
    } catch (error: any) {
      handleErrorAlerts(
        error.response?.data?.error || t("notesSection.handleSave.error")
      );
    }
  };

  useEffect(() => {
    setNotesCount?.(notesData?.length ?? 0);
  }, [notesData?.length, setNotesCount]);
  return (
    <div className="bg-gray-800 p-6 border-b border-gray-700">
      <div className="max-w-5xl mx-auto">
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex sm:items-center items-start sm:gap-0 gap-4 justify-between mb-4 sm:flex-row flex-col">
            <h3 className="text-lg font-semibold text-white">
              {t("lessonNotes")}
            </h3>
            <button
              disabled={!notes || !title}
              onClick={handleSaveNotes}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("notesSection.save")}
            </button>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            placeholder={t("notesSection.form.title")}
            className="w-full mb-5 px-3 py-4 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
          />
          <textarea
            placeholder={t("notesSection.form.placeholder")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-40 p-3 bg-gray-800 border border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
          />
          {savedNotes[currentLessonId] && (
            <p className="text-green-400 text-sm mt-2">
              {t("notesSection.saveSucceed")}
            </p>
          )}
        </div>
      </div>
      <div className="w-full max-w-5xl mx-auto my-10 space-y-4">
        {notesData?.map((note: any) => (
          <div
            key={note.id}
            className="relative group bg-gray-900 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between border border-gray-700 hover:border-purple-500 transition-colors"
          >
            {/* Left: title + content */}
            {editNote === note?.id ? (
              <div className="w-full">
                <input
                  type="text"
                  value={editNoteTitle}
                  onChange={(e) => setEditNoteTitle(e.target.value)}
                  placeholder={t("notesSection.form.title")}
                  className="w-full mb-5 px-3 py-4 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
                />
                <textarea
                  placeholder={t("notesSection.form.placeholder")}
                  value={editNoteValue}
                  onChange={(e) => setEditNoteValue(e.target.value)}
                  className="w-full h-40 p-3 bg-gray-800 border border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
                />
                <div className="mt-2 flex justify-end gap-3">
                  <button
                    onClick={() => setEditNote(null)}
                    className="px-8 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    {t("notesSection.form.cancel")}
                  </button>
                  <button
                    disabled={!editNoteTitle || !editNoteValue}
                    onClick={() => handleEditNotes(note?.id)}
                    className="cursor-pointer px-8 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    {t("notesSection.form.save")}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Hover action button */}
                <button
                  onClick={() => {
                    setEditNoteTitle(note?.title ?? "");
                    setEditNoteValue(note?.content ?? "");
                    setEditNote(note?.id);
                  }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg"
                >
                  {t("notesSection.form.edit")}
                </button>
                <div className="space-y-2">
                  <h2 className="text-base font-semibold text-white">
                    {note?.title || "-"}
                  </h2>
                  <p className="text-gray-300 text-sm">
                    {note?.content || "-"}
                  </p>
                </div>
                {/* Right: created date */}
                <p className="mt-3 sm:mt-0 text-xs text-gray-400 whitespace-nowrap">
                  {formatDateTimeSimple(note?.created_at, {
                    locale: i18n.language,
                    t: t,
                  }) || "-"}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
