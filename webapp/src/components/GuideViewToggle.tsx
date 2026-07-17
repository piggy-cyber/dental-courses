"use client";

export type GuideView = "textbook" | "mastery" | "split";

type GuideViewToggleProps = {
  position: "top" | "bottom";
  value: GuideView;
  onChange: (view: GuideView) => void;
};

const views: Array<{ value: GuideView; eyebrow: string; label: string }> = [
  { value: "textbook", eyebrow: "Full context", label: "Textbook Companion" },
  { value: "mastery", eyebrow: "Fast review", label: "Course Mastery Guide" },
  { value: "split", eyebrow: "Compare", label: "Read both side by side" },
];

export function GuideViewToggle({ position, value, onChange }: GuideViewToggleProps) {
  return (
    <nav
      className={`public-guide-switcher public-guide-switcher-${position}`}
      aria-label={position === "top" ? "Choose guide view" : "Choose another guide view"}
    >
      {views.map((view) => (
        <button
          type="button"
          key={view.value}
          aria-pressed={value === view.value}
          onClick={() => onChange(view.value)}
        >
          <small>{view.eyebrow}</small>
          <strong>{view.label}</strong>
        </button>
      ))}
    </nav>
  );
}
