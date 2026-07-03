import Link from "next/link";
import { notFound } from "next/navigation";
import { ResourcePreviewPanel } from "@/components/ResourcePreviewPanel";

export const dynamic = "force-dynamic";

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resourceId = Number(id);

  if (!Number.isFinite(resourceId)) notFound();

  return (
    <div className="space-y-6">
      <header>
        <Link href="/library" className="text-sm text-brand-blue hover:underline">
          &larr; Course library
        </Link>
        <p className="eyebrow mt-2">Preview</p>
        <h1 className="text-2xl font-bold text-brand-navy">File preview</h1>
      </header>

      <ResourcePreviewPanel resourceId={resourceId} />
    </div>
  );
}
