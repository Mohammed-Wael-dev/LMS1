// src/components/VideoPlayer.tsx
import React, { useMemo, useRef, useState } from "react";
import ReactPlayer from "react-player";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { readUserFromStorage } from "../../services/auth";

/** Forwarded ref in v3 aims to behave like HTMLMediaElement */
type PlayerHandle = any;

type Props = {
  src: string;
  title?: string;
  onComplete?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  startMuted?: boolean;
  watched?: boolean;
  poster?: string;
  privacyEnhanced?: boolean;
};

const formatTime = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, "0")}`;
};

function toNoCookie(url: string): string {
  try {
    const u = new URL(url);
    if (!/youtube\.com|youtu\.be/.test(u.hostname)) return url;
    let id = "";
    if (u.hostname.includes("youtu.be"))
      id = u.pathname.replace(/^\/+/, "").split("/")[0] || "";
    else if (u.pathname.startsWith("/embed/"))
      id = u.pathname.split("/embed/")[1]?.split("/")[0] || "";
    else if (u.pathname.startsWith("/shorts/"))
      id = u.pathname.split("/shorts/")[1]?.split("/")[0] || "";
    else id = u.searchParams.get("v") || "";
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : url;
  } catch {
    return url;
  }
}

// const isYouTube = (u: string) =>
//   /(?:youtu\.be|youtube\.com\/(?:watch|embed|shorts))/i.test(u);

// const getYouTubeId = (u: string) => {
//   try {
//     const url = new URL(u);
//     if (url.hostname.includes("youtu.be"))
//       return url.pathname.replace(/^\//, "").split("/")[0] || "";
//     if (url.pathname.startsWith("/embed/"))
//       return url.pathname.split("/embed/")[1]?.split("/")[0] || "";
//     if (url.pathname.startsWith("/shorts/"))
//       return url.pathname.split("/shorts/")[1]?.split("/")[0] || "";
//     return url.searchParams.get("v") || "";
//   } catch {
//     return "";
//   }
// };

const VideoPlayer: React.FC<Props> = ({
  src,
  title,
  onComplete,
  onPrev,
  onNext,
  startMuted = false,
  // poster,
  watched,
  privacyEnhanced = false,
}) => {
  const currentUser: User = readUserFromStorage();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerHandle>(null);
  const lastVolRef = useRef(1);

  const { t, i18n } = useTranslation("coursePlayer");
  const isRTL = i18n.dir() === "rtl";

  const safeSrc = useMemo(
    () => (privacyEnhanced ? toNoCookie(src) : src),
    [src, privacyEnhanced]
  );
  // const resolvedPoster =
  //   poster ||
  //   (isYouTube(safeSrc)
  //     ? `https://i.ytimg.com/vi/${getYouTubeId(safeSrc)}/hqdefault.jpg`
  //     : "/poster-fallback.jpg");

  // UI state
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(!!startMuted);
  const [rate, setRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pct = duration
    ? Math.max(0, Math.min(100, (current / duration) * 100))
    : 0;

  const togglePlay = () => setPlaying((p) => !p);

  const seekToSeconds = (t: number) => {
    const clamped = Math.max(0, Math.min(duration || 0, t));
    const el = playerRef.current as any;
    if (el && typeof el.currentTime === "number") {
      el.currentTime = clamped;
    } else if (el?.seekTo) {
      el.seekTo(clamped, "seconds");
    }
    setCurrent(clamped);
  };

  const handleSeekPct = (val: number) => {
    if (!duration) return;
    seekToSeconds((val / 100) * duration);
  };

  const skip = (sec: number) => seekToSeconds(current + sec);

  const handleMuteClick = () => {
    const goingToMuted = !muted;

    if (goingToMuted) {
      lastVolRef.current = volume || lastVolRef.current;
      setVolume(0);
    } else {
      setVolume(lastVolRef.current || 1);
    }

    setMuted(goingToMuted);
  };

  const changeRate = (r: number) => setRate(r);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  };

  const canPlay = (ReactPlayer as any).canPlay?.(safeSrc) ?? true;

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-lg overflow-hidden group select-none"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {title && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent px-4 py-2 text-white text-sm">
          {title}
        </div>
      )}

      {/* Renderer (chromeless) */}
      <div className="w-full h-full aspect-video">
        {/* {!playing && (
          <img
            src={resolvedPoster}
            alt=""
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
        )} */}
        {canPlay ? (
          <ReactPlayer
            ref={playerRef}
            src={safeSrc}
            controls={false}
            playing={playing}
            volume={volume}
            muted={muted}
            playbackRate={rate}
            width="100%"
            height="100%"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => setError(t("video.error"))}
            onEnded={() => {
              setPlaying(false);
              if (currentUser?.is_student && !watched) {
                onComplete?.();
              }
            }}
            onDurationChange={(d: any) =>
              setDuration(
                typeof d === "number"
                  ? d
                  : (playerRef.current as any)?.duration || 0
              )
            }
            onTimeUpdate={() => {
              const tnow = (playerRef.current as any)?.currentTime;
              if (typeof tnow === "number") setCurrent(tnow);
            }}
            onProgress={() => {
              const tnow = (playerRef.current as any)?.currentTime;
              if (typeof tnow === "number") setCurrent(tnow);
            }}
            config={{
              youtube: {
                rel: 0,
                enablejsapi: 1,
                origin: window.location.origin,
              },
            }}
          />
        ) : (
          <div className="w-full h-full aspect-video bg-black" />
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-red-600 text-white text-xs px-3 py-1 rounded shadow">
          {error}
        </div>
      )}

      {/* Center play overlay */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <button
            onClick={togglePlay}
            className="sm:w-20 sm:h-20 w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-700"
          >
            <Play className="sm:w-8 sm:h-8 w-5 h-5 text-white ltr:ml-1 rtl:mr-1" />
          </button>
        </div>
      )}

      {/* Controls bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="sm:p-4 p-2">
          {/* Progress (RTL-aware) */}
          <div className="sm:mb-4 mb-2">
            <input
              dir={isRTL ? "rtl" : "ltr"}
              type="range"
              min={0}
              max={100}
              value={pct}
              onChange={(e) => handleSeekPct(parseFloat(e.target.value))}
              className="slider w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to ${
                  isRTL ? "left" : "right"
                }, #9333ea 0%, #9333ea ${pct}%, #4b5563 ${pct}%, #4b5563 100%)`,
              }}
              aria-label="Seek"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center sm:gap-4 gap-1">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="text-white hover:text-purple-400"
              >
                {playing ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>

              {/* -10 / +10 */}
              <button
                onClick={() => skip(-10)}
                className="text-white hover:text-purple-400"
                title="-10s"
              >
                {i18n.language === "ar" ? (
                  <SkipForward className="w-5 h-5" />
                ) : (
                  <SkipBack className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => skip(10)}
                className="text-white hover:text-purple-400"
                title="+10s"
              >
                {i18n.language === "ar" ? (
                  <SkipBack className="w-5 h-5" />
                ) : (
                  <SkipForward className="w-5 h-5" />
                )}
              </button>

              {/* Prev / Next (RTL-aware icons) */}
              {onPrev && (
                <button
                  onClick={onPrev}
                  className="text-white hover:text-purple-400"
                  title={t("video.prev") || "Previous"}
                >
                  {isRTL ? (
                    <SkipForward className="w-5 h-5" />
                  ) : (
                    <SkipBack className="w-5 h-5" />
                  )}
                </button>
              )}
              {onNext && (
                <button
                  onClick={onNext}
                  className="text-white hover:text-purple-400"
                  title={t("video.next") || "Next"}
                >
                  {isRTL ? (
                    <SkipBack className="w-5 h-5" />
                  ) : (
                    <SkipForward className="w-5 h-5" />
                  )}
                </button>
              )}

              {/* Volume (RTL-aware) */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleMuteClick}
                  className="text-white hover:text-purple-400"
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="w-5 h-5 rtl:rotate-180" />
                  ) : (
                    <Volume2 className="w-5 h-5 rtl:rotate-180" />
                  )}
                </button>
                <input
                  dir={isRTL ? "rtl" : "ltr"}
                  type="range"
                  min={0}
                  max={100}
                  value={muted ? 0 : Math.round(volume * 100)}
                  onChange={(e) => {
                    const v = Math.max(
                      0,
                      Math.min(1, parseFloat(e.target.value) / 100)
                    );
                    setVolume(v);
                    if (v === 0) setMuted(true);
                    else if (muted) setMuted(false);
                  }}
                  className="slider sm:w-20 w-14 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to ${
                      isRTL ? "left" : "right"
                    }, #9333ea 0%, #9333ea ${Math.round(
                      volume * 100
                    )}%, #4b5563 ${Math.round(volume * 100)}%, #4b5563 100%)`,
                  }}
                  aria-label="Volume"
                />
              </div>

              <div className="text-white sm:text-sm text-xs">
                {formatTime(current)} / {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Settings popover (anchor side flips in RTL) */}
              <div className="relative group/settings h-5">
                <button className="text-white hover:text-purple-400">
                  <Settings className="w-5 h-5" />
                </button>
                <div
                  className={`absolute sm:bottom-8 bottom-5 ${
                    isRTL ? "left-0" : "right-0"
                  } bg-black/90 rounded-lg sm:p-2 p-1 opacity-0 group-hover/settings:opacity-100 transition-opacity`}
                >
                  <div className="text-white sm:text-sm text-xs sm:mb-2 mb-1">
                    {t("video.speed")}
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                      <button
                        key={r}
                        onClick={() => changeRate(r)}
                        className={`block w-full text-left px-3 sm:py-1 py-0 sm:text-sm text-xs hover:bg-purple-600 rounded ${
                          rate === r ? "text-purple-400" : "text-white"
                        }`}
                      >
                        {r}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-purple-400"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
