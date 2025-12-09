import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Trash2, GripVertical } from "lucide-react";
import type { PageComponent } from "@/types";
import { ComponentPreview } from "./ComponentPreview";

interface SortableItemProps {
  comp: PageComponent;
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  toggleVisibility: (id: string) => void;
  deleteComponent: (id: string) => void;
}

export function SortableItem({
  comp,
  selectedId,
  setSelectedId,
  toggleVisibility,
  deleteComponent,
}: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: comp.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => setSelectedId(comp.id)}
      className={`relative group cursor-pointer transition-all ${
        !comp.visible ? "opacity-40" : ""
      } ${
        selectedId === comp.id
          ? "ring-2 ring-primary ring-inset"
          : "hover:ring-2 hover:ring-primary/50 hover:ring-inset"
      }`}
    >
      {/* 拖拽手柄 */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded bg-white/80 shadow opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
      {/* 组件预览 */}
      <ComponentPreview component={comp} />
      {/* 操作按钮 */}
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button
          size="icon"
          variant="secondary"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            toggleVisibility(comp.id);
          }}
        >
          {comp.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </Button>
        <Button
          size="icon"
          variant="destructive"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            deleteComponent(comp.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
