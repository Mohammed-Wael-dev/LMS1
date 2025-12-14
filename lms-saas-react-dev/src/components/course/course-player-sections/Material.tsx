import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { readUserFromStorage } from "../../../services/auth";

interface Props {
  currentLessonData: Lesson | undefined;
  onMaterialComplete: (goNext: boolean) => Promise<void>;
}

const getPath = (u?: string) => {
  if (!u) return "";
  try {
    return new URL(u).pathname.toLowerCase();
  } catch {
    return u.toLowerCase();
  }
};

const isImagePath = (p: string) =>
  /\.(png|jpe?g|gif|webp|bmp|svg|tiff?)$/i.test(p);

const isPdfPath = (p: string) => /\.pdf$/i.test(p);

// NEW: treat different sources uniformly
const pickSourceUrl = (lesson?: Lesson): string => {
  const file = (lesson as any)?.file;
  const url = (lesson as any)?.url;
  return (file ?? url ?? "") as string;
};

// NEW: external checker (same-origin vs external)
const isExternalUrl = (u?: string) => {
  if (!u) return false;
  try {
    const target = new URL(u, window.location.origin);
    return target.origin !== window.location.origin;
  } catch {
    return false;
  }
};

export default function Material({
  currentLessonData,
  onMaterialComplete,
}: Props) {
  const { t } = useTranslation("coursePlayer");

  const currentUser: User = readUserFromStorage();
  const sourceUrl = pickSourceUrl(currentLessonData);
  const path = getPath(sourceUrl);
  const isImg = isImagePath(path);
  const isPdf = isPdfPath(path);
  const isExternal = isExternalUrl(sourceUrl);
  const fileIsMissing = !(currentLessonData as any)?.file; // NEW

  const [downloading, setDownloading] = useState(false);

  const openInNewTab = (rawUrl: string, e?: React.MouseEvent) => {
    if (!rawUrl) return;
    e?.preventDefault();
    e?.stopPropagation();

    const a = document.createElement("a");
    a.href = rawUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    // Optional: avoid leaking referrer and improve compatibility
    a.referrerPolicy = "no-referrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const downloadMaterial = async (rawUrl?: string, e?: React.MouseEvent) => {
    if (!rawUrl) return;
    if (isExternalUrl(rawUrl)) {
      openInNewTab(rawUrl, e);
      return;
    }
    try {
      setDownloading(true);

      const u = new URL(rawUrl, window.location.origin);
      const pathname = u.pathname;
      const base = pathname.substring(pathname.lastIndexOf("/") + 1) || "file";
      const filename = base.includes(".") ? base : `${base}.download`;

      const res = await fetch(rawUrl, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e: any) {
      console.log(e);
      window.open(rawUrl, "_blank", "noopener");
    } finally {
      setDownloading(false);
    }
  };

  const safeFileName = useMemo(() => {
    if (!sourceUrl) return "";
    try {
      return decodeURIComponent(
        new URL(sourceUrl, window.location.origin).pathname.split("/").pop() ||
          ""
      );
    } catch {
      const parts = sourceUrl.split("/");
      return parts[parts.length - 1] || "file";
    }
  }, [sourceUrl]);

  // Small pill: if external-only, make it "open"; otherwise do download
  const DownloadPill = (
    <button
      type="button"
      onClick={(e) => downloadMaterial(sourceUrl, e)}
      className="absolute left-3 top-3 z-20 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/90 border border-gray-200 shadow hover:bg-white"
      title={
        downloading
          ? t("content.downloading")
          : isExternal
          ? t("content.open")
          : t("content.download")
      }
    >
      <Download className="w-5 h-5 text-gray-700" />
    </button>
  );

  // Image preview (only when we truly have an image file/url)
  if (isImg && sourceUrl) {
    return (
      <div className="relative bg-white rounded-lg p-4 shadow-lg">
        {DownloadPill}
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900 text-center">
            {currentLessonData?.title}
          </h1>
          {currentLessonData?.description && (
            <p className="text-gray-600 text-center">
              {currentLessonData.description}
            </p>
          )}
          <img
            src={sourceUrl}
            alt={safeFileName || "material image"}
            className="max-h-[70vh] w-auto rounded-lg border border-gray-200 object-contain"
            loading="eager"
          />
          {safeFileName && (
            <div className="text-sm text-gray-500 break-all">
              {safeFileName}
            </div>
          )}
          {currentUser.is_student && !currentLessonData?.completed && (
            <div className="w-full flex justify-end">
              <button
                onClick={() => onMaterialComplete(true)}
                className="inline-flex items-center px-4 mt-2 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                {t("content.markComplete")}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // PDF preview:
  // - If it's an EXTERNAL PDF and file is null => show FALLBACK (open in new tab)
  // - Otherwise embed (same-origin or uploaded)
  const shouldShowFallbackForExternalPdf =
    isPdf && sourceUrl && isExternal && fileIsMissing; // NEW

  if (isPdf && sourceUrl && !shouldShowFallbackForExternalPdf) {
    return (
      <div className="relative bg-white rounded-lg p-4 shadow-lg">
        {DownloadPill}
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold text-gray-900 text-center">
            {currentLessonData?.title}
          </h1>
          {currentLessonData?.description && (
            <p className="text-gray-600 text-center">
              {currentLessonData.description}
            </p>
          )}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <iframe
              src={sourceUrl}
              className="w-full h-[70vh]"
              title={safeFileName || "PDF preview"}
            />
          </div>
          {safeFileName && (
            <div className="text-sm text-gray-500 text-center break-all">
              {safeFileName}
            </div>
          )}

          {currentUser.is_student && !currentLessonData?.completed && (
            <div className="w-full flex justify-end">
              <button
                onClick={() => onMaterialComplete(true)}
                className="inline-flex items-center px-4 mt-2 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                {t("content.markComplete")}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // FALLBACK CARD (also used for external-only PDFs when file is null)
  return (
    <div className="relative bg-white rounded-lg p-8 shadow-lg">
      {DownloadPill}
      <div className="max-w-4xl mx-auto text-center pt-10">
        <button
          type="button" // ✅ NEW
          onClick={(e) =>
            isExternal
              ? openInNewTab(sourceUrl, e) // ✅ force new tab
              : downloadMaterial(sourceUrl, e)
          }
          className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6"
          title={
            downloading
              ? t("content.downloading")
              : isExternal
              ? t("content.open")
              : t("content.download")
          }
        >
          <Download className="w-10 h-10 text-orange-600" />
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {currentLessonData?.title}
        </h1>

        <p className="text-gray-600 mb-8">{currentLessonData?.description}</p>

        {sourceUrl && (
          <div className="text-sm text-gray-500 break-all">
            {safeFileName || sourceUrl}
          </div>
        )}
      </div>

      {currentUser.is_student && !currentLessonData?.completed && (
        <button
          onClick={() => onMaterialComplete(true)}
          className="inline-flex items-center px-4 mt-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 self-end"
        >
          {t("content.markComplete")}
        </button>
      )}
    </div>
  );
}
