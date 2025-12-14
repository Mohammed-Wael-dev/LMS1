// components/qa/ReactionGroup.tsx
import { useRef, useState } from "react";
import { Heart, ThumbsUp, Sparkles } from "lucide-react";
import { Subject, useReaction } from "../../../hooks/useReaction";
import { useTranslation } from "react-i18next";

const colorFor = (type: null | "like" | "love" | "clap") =>
  type === "love"
    ? "text-rose-500"
    : type === "clap"
    ? "text-amber-500"
    : type === "like"
    ? "text-sky-500"
    : "text-gray-400";

export default function ReactionGroup({
  subject,
  countsFromServer,
  myFromServer = null, // pass user's current reaction type if you have it
  className = "",
}: {
  subject: Subject;
  countsFromServer: {
    count_likes: number;
    count_loves: number;
    count_claps: number;
  };
  myFromServer?: null | "like" | "love" | "clap";
  className?: string;
}) {
  const PRESS_THRESHOLD = 350; // ms
  const downAt = useRef<number>(0);

  const { my, counts, isPending, toggleDefaultLike, pick } = useReaction({
    subject,
    initCounts: {
      like: countsFromServer.count_likes,
      love: countsFromServer.count_loves,
      clap: countsFromServer.count_claps,
    },
    initMine: myFromServer ?? null,
  });

  const [open, setOpen] = useState(false);
  const hideTimer = useRef<number | null>(null);
  // const pressTimer = useRef<number | null>(null);
  // const [pressed, setPressed] = useState(false);
  const { t } = useTranslation("coursePlayer");

  const safeOpen = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setOpen(true);
  };
  const safeClose = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setOpen(false), 120) as any;
  };

  // mobile long-press to open palette
  const onPointerDown = (e: React.PointerEvent) => {
    // record press start; we’ll decide what to do on release
    console.log(e.currentTarget.ariaValueNow);
    downAt.current = Date.now();
  };

  // const cancelPress = () => {
  //   setPressed(false);
  //   if (pressTimer.current) window.clearTimeout(pressTimer.current);
  //   pressTimer.current = null;
  // };

  const onPointerUp = (e: React.PointerEvent) => {
    console.log(e.currentTarget.ariaValueNow);

    const elapsed = Date.now() - (downAt.current || 0);
    downAt.current = 0;

    // Long-press -> open palette, don't toggle anything
    if (elapsed >= PRESS_THRESHOLD) {
      setOpen(true);
      return;
    }

    // Short tap -> default like toggle (add/remove)
    toggleDefaultLike();
  };

  const onPointerCancel = () => {
    downAt.current = 0;
  };

  const onPointerLeave = () => {
    // if finger slides off, treat as cancel
    downAt.current = 0;
  };

  // useEffect(() => () => cancelPress(), []);

  // click a palette item -> pick + close immediately
  const choose = async (t: "like" | "love" | "clap") => {
    await pick(t);
    setOpen(false);
  };

  const total = counts.like + counts.love + counts.clap;

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={safeOpen}
      onMouseLeave={safeClose}
    >
      {/* Main button (one-click like / remove). Colors reflect current reaction */}
      <button
        type="button"
        disabled={isPending}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerLeave}
        className={`flex items-center gap-1 text-sm px-2 py-1 rounded transition-colors 
          ${my ? "bg-gray-700" : "hover:bg-gray-700"}
          ${colorFor(my)}
        `}
        title={my ? t("reactions.removeReact") : t("reactions.like")}
      >
        {my === "love" ? (
          <Heart
            className="w-4 h-4"
            fill="currentColor"
            stroke="currentColor"
          />
        ) : my === "clap" ? (
          <Sparkles
            className="w-4 h-4"
            fill="currentColor"
            stroke="currentColor"
          />
        ) : (
          <ThumbsUp
            className="w-4 h-4"
            fill={"currentColor"}
            stroke="currentColor"
          />
        )}

        <span className="tabular-nums">{total}</span>
      </button>

      {/* Reaction palette */}
      {open && (
        <div
          className="absolute z-30 -top-12 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-700 rounded-full px-2 py-1 flex gap-1 shadow-lg"
          onMouseEnter={safeOpen}
          onMouseLeave={safeClose}
        >
          <PaletteBtn
            label={t("reactions.like")}
            active={my === "like"}
            colorClass="text-sky-500"
            onClick={() => choose("like")}
          >
            <ThumbsUp
              className="w-4 h-4"
              fill={my === "like" ? "currentColor" : "none"}
              stroke="currentColor"
            />
          </PaletteBtn>

          <PaletteBtn
            label={t("reactions.love")}
            active={my === "love"}
            colorClass="text-rose-500"
            onClick={() => choose("love")}
          >
            <Heart
              className="w-4 h-4"
              fill={my === "love" ? "currentColor" : "none"}
              stroke="currentColor"
            />
          </PaletteBtn>

          <PaletteBtn
            label={t("reactions.clap")}
            active={my === "clap"}
            colorClass="text-amber-500"
            onClick={() => choose("clap")}
          >
            <Sparkles
              className="w-4 h-4"
              fill={my === "clap" ? "currentColor" : "none"}
              stroke="currentColor"
            />
          </PaletteBtn>
        </div>
      )}
    </div>
  );
}

function PaletteBtn({
  children,
  onClick,
  active,
  label,
  colorClass,
}: React.PropsWithChildren<{
  onClick: () => void;
  active?: boolean;
  label: string;
  colorClass: string; // tailwind text color
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`p-2 rounded-full outline-none transition-colors
        hover:bg-gray-700
        ${colorClass}
        ${active ? "bg-gray-700" : ""}
      `}
    >
      {children}
    </button>
  );
}
