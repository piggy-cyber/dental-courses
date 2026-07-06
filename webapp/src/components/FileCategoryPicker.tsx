"use client";

import type { AssignTarget } from "@/lib/resource-kinds";
import {
  ESSENTIAL_SLOT_LABELS,
  SUPPLEMENTAL_LABELS,
  type EssentialSlot,
  type SupplementalCategory,
} from "@/lib/resource-kinds";
import { ESSENTIAL_ROLES, LECTURE_ROLES, SUPPLEMENTAL_ROLES } from "@/lib/resource-taxonomy";

type LectureOption = { id: string; title: string };
type SectionOption = { id: string; label: string };

type Props = {
  value: string;
  onChange: (target: AssignTarget) => void;
  lectures: LectureOption[];
  sections?: SectionOption[];
  disabled?: boolean;
};

export function FileCategoryPicker({ value, onChange, lectures, sections, disabled }: Props) {
  function parseValue(raw: string): void {
    if (!raw) return;
    if (raw.startsWith("essential:")) {
      onChange({ type: "essential", slot: raw.replace("essential:", "") as EssentialSlot });
      return;
    }
    if (raw.startsWith("lecture:")) {
      const [, lectureId, role] = raw.split(":");
      onChange({
        type: "lecture",
        lectureId,
        role: role as "slides" | "transcript_file" | "other",
      });
      return;
    }
    if (raw.startsWith("supplemental:")) {
      const [, category, sectionId] = raw.split(":");
      onChange({
        type: "supplemental",
        category: category as SupplementalCategory,
        sectionId: sectionId || undefined,
      });
    }
  }

  const customSections = (sections ?? []).filter((s) => s.label !== "Lectures");

  return (
    <select
      className="app-input mt-1 w-full text-sm"
      value={value}
      disabled={disabled}
      onChange={(e) => parseValue(e.target.value)}
    >
      <option value="">Assign to…</option>
      <optgroup label="Essentials">
        {ESSENTIAL_ROLES.map((role) => {
          const slot = role.id.replace("essential_", "") as EssentialSlot;
          return (
            <option key={role.id} value={`essential:${slot}`}>
              {ESSENTIAL_SLOT_LABELS[slot]}
            </option>
          );
        })}
      </optgroup>
      <optgroup label="Lectures">
        {lectures.flatMap((lecture) =>
          LECTURE_ROLES.map((role) => {
            const roleKey = role.id.replace("lecture_", "") as "slides" | "transcript_file" | "other";
            return (
              <option key={`${lecture.id}-${role.id}`} value={`lecture:${lecture.id}:${roleKey}`}>
                {lecture.title} · {role.label}
              </option>
            );
          })
        )}
      </optgroup>
      <optgroup label="Labs and extras">
        {SUPPLEMENTAL_ROLES.flatMap((role) => {
          const cat = role.id.replace("supplemental_", "") as SupplementalCategory;
          if (customSections.length === 0) {
            return (
              <option key={role.id} value={`supplemental:${cat}`}>
                {SUPPLEMENTAL_LABELS[cat]}
              </option>
            );
          }
          return customSections.map((section) => (
            <option key={`${role.id}-${section.id}`} value={`supplemental:${cat}:${section.id}`}>
              {section.label} · {SUPPLEMENTAL_LABELS[cat]}
            </option>
          ));
        })}
      </optgroup>
    </select>
  );
}
