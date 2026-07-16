import publicGuideData from "@/data/public-guides.json";

export type PublicGuideSection = {
  id: string;
  title: string;
};

export type PublicGuide = {
  slug: "course-mastery-guide" | "textbook-companion";
  title: string;
  summary: string;
  sections: PublicGuideSection[];
  html: string;
};

export type PublicGuideCourse = {
  code: string;
  slug: string;
  title: string;
  summary: string;
  guides: {
    mastery: PublicGuide;
    textbook: PublicGuide;
  };
};

const courses = publicGuideData.courses as PublicGuideCourse[];

export function getPublicGuideCourses(): PublicGuideCourse[] {
  return courses;
}

export function getPublicGuideCourse(slug: string): PublicGuideCourse | null {
  return courses.find((course) => course.slug === slug) ?? null;
}

export function getPublicGuide(
  courseSlug: string,
  guideSlug: string,
): { course: PublicGuideCourse; guide: PublicGuide; type: "mastery" | "textbook" } | null {
  const course = getPublicGuideCourse(courseSlug);
  if (!course) return null;
  if (course.guides.mastery.slug === guideSlug) {
    return { course, guide: course.guides.mastery, type: "mastery" };
  }
  if (course.guides.textbook.slug === guideSlug) {
    return { course, guide: course.guides.textbook, type: "textbook" };
  }
  return null;
}
