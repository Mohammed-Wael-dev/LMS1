import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";

const DND_TYPES = { MODULE: "MODULE" } as const;

type Props = {
  module: Module;
  index: number;
  moveModule: (dragId: string, hoverId: string) => void;
  onDragEnd: () => void;
  children: React.ReactNode;
};

export default function ModuleItem({
  module,
  index,
  moveModule,
  onDragEnd,
  children,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [, drop] = useDrop({
    accept: DND_TYPES.MODULE,
    hover(item: { id: string; index: number }) {
      if (!ref.current || item.id === module.id) return;
      moveModule(item.id, module.id);
      item.index = index;
    },
  });
  const [{ isDragging }, drag] = useDrag({
    type: DND_TYPES.MODULE,
    item: { id: module.id, index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: () => onDragEnd(),
  });
  drag(drop(ref));
  return (
    <div ref={ref} style={{ opacity: isDragging ? 0.7 : 1 }}>
      {children}
    </div>
  );
}
