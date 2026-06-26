import type { EventCategory, EventCategoryMeta } from "../../types/calendar";
import { getCategoryDotColor, getCategoryTextColor } from "../../utils/calendarUtils";

interface CategoryFilterProps {
  categories: EventCategoryMeta[];
  activeFilters: Set<EventCategory>;
  onToggle: (categoryId: EventCategory) => void;
}

/** 카테고리별 색상 필터 칩 — 클릭 시 표시/숨김 토글 */
export function CategoryFilter({
  categories,
  activeFilters,
  onToggle,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const isActive = activeFilters.has(cat.id);
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onToggle(cat.id)}
            className={[
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
              isActive
                ? "border-transparent shadow-sm"
                : "border-border bg-surface text-text-secondary opacity-60 hover:opacity-100",
            ].join(" ")}
            style={
              isActive
                ? {
                    backgroundColor: cat.color,
                    color: getCategoryTextColor(cat.color),
                  }
                : undefined
            }
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: getCategoryDotColor(cat.color, isActive),
              }}
            />
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
