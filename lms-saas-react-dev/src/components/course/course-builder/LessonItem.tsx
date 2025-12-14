import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";

const DND_TYPES = { LESSON: "LESSON" } as const;

type Props = {
  moduleId: string;
  lesson: Lesson;
  index: number;
  moveLesson: (moduleId: string, dragId: string, hoverId: string) => void;
  onDragEnd: () => void;
  canDrag?: boolean;
  children: React.ReactNode;
};

export default function LessonItem({
  moduleId,
  lesson,
  index,
  moveLesson,
  onDragEnd,
  canDrag = true,
  children,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  const [, drop] = useDrop({
    accept: DND_TYPES.LESSON,
    hover(item: { id: string; index: number; moduleId: string }) {
      if (!ref.current || item.id === lesson.id || item.moduleId !== moduleId)
        return;
      moveLesson(moduleId, item.id, lesson.id);
      item.index = index;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: DND_TYPES.LESSON,
    item: {
      id: lesson.id,
      index,
      moduleId,
      content_type: (lesson as any).content_type,
    },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    canDrag: () => !!canDrag,
    end: () => onDragEnd(),
  });

  if (canDrag) drag(drop(ref));
  else drop(ref);

  return (
    <div ref={ref} style={{ opacity: isDragging ? 0.7 : 1 }}>
      {children}
    </div>
  );
}
