export const isYouTubeUrl = (url: string) =>
  /(?:youtube\.com\/watch\?v=|youtu\.be\/)/i.test(url || "");

export const extractYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  const m =
    url.match(/[?&]v=([^&#]+)/) ||
    url.match(/youtu\.be\/([^?&#/]+)/) ||
    url.match(/youtube\.com\/embed\/([^?&#/]+)/);
  return m ? m[1] : null;
};

export const getYouTubeThumbnail = (
  videoId: string,
  size: "hq" | "mq" | "sd" | "max" = "hq"
) => {
  const map = {
    hq: "hqdefault.jpg",
    mq: "mqdefault.jpg",
    sd: "sddefault.jpg",
    max: "maxresdefault.jpg",
  };
  return `https://img.youtube.com/vi/${videoId}/${map[size]}`;
};

/** Load YT IFrame API once, then resolve a ready flag */
let ytApiPromise: Promise<typeof window.YT> | null = null;
export const loadYouTubeIFrameAPI = (): Promise<typeof window.YT> => {
  if (typeof window === "undefined")
    return Promise.reject(new Error("window not available"));
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    (window as any).onYouTubeIframeAPIReady = () => resolve(window.YT);
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return ytApiPromise!;
};

/** Get duration (seconds) for a YT video id without API key */
export const getYouTubeDurationSeconds = async (
  videoId: string
): Promise<number> => {
  if (!videoId) return 0;
  const YT = await loadYouTubeIFrameAPI();

  return new Promise<number>((resolve) => {
    const el = document.createElement("div");
    el.style.position = "fixed";
    el.style.left = "-99999px";
    el.style.top = "-99999px";
    document.body.appendChild(el);

    const player = new YT.Player(el, {
      videoId,
      events: {
        onReady: () => {
          // give it a moment to init duration
          setTimeout(() => {
            try {
              const d = player.getDuration?.() ?? 0;
              player.destroy?.();
              el.remove();
              resolve(Number.isFinite(d) ? d : 0);
            } catch {
              try {
                player.destroy?.();
                el.remove();
              } catch {
                //
              }
              resolve(0);
            }
          }, 250);
        },
      },
      playerVars: { playsinline: 1, controls: 0, rel: 0, modestbranding: 1 },
    });
  });
};

/** Try to read duration for a direct video url (if CORS allows) */
export const getHtmlVideoDurationSeconds = (url: string): Promise<number> =>
  new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = url;
    v.onloadedmetadata = () => {
      const d = v.duration || 0;
      resolve(Number.isFinite(d) ? d : 0);
      v.remove();
    };
    v.onerror = () => {
      resolve(0);
      v.remove();
    };
  });

export const secondsToHours = (s: number) => Math.round((s / 3600) * 100) / 100; // two decimals

export const estimateReadingDurationHoursFromHtml = (
  htmlOrText: string
): number => {
  const text = String(htmlOrText || "").replace(/<[^>]+>/g, " ");
  const words = (text.match(/\b[\p{L}\p{N}'’-]+\b/gu) || []).length;
  const minutes = Math.max(1, Math.round(words / 200)); // ~200 wpm
  return Math.round((minutes / 60) * 100) / 100;
};

export const isContent = (t?: string | null): boolean =>
  !!t && ["video", "article", "material"].includes(t);

export const reindexOrders1Based = <T extends { order?: number }>(arr: T[]) =>
  arr.map((x, i) => ({ ...x, order: i + 1 }));

export const nextAssessmentTitle = (
  module: { lessons?: any[] },
  type: "quiz" | "exam" | "assessment"
) => {
  const count = (module.lessons || []).filter(
    (l) => l?.content_type === type
  ).length;
  return type === "quiz"
    ? `Quiz ${count + 1}`
    : type === "exam"
    ? `Exam ${count + 1}`
    : `Assessment ${count + 1}`;
};

export async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary); // raw base64, no data: prefix
}
