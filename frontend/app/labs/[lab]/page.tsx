import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LabDetailView, getAllLabs, getLabBySlug, isLabSlug } from "@/features/labs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, createPageMetadata } from "@/lib/seo";

interface LabPageProps {
  params: Promise<{ lab: string }>;
}

export function generateStaticParams() {
  return getAllLabs().map((lab) => ({ lab: lab.slug }));
}

export async function generateMetadata({ params }: LabPageProps): Promise<Metadata> {
  const { lab: slug } = await params;
  const lab = getLabBySlug(slug);
  if (!lab) {
    return createPageMetadata({
      title: "Lab not found",
      description: "That Svigl Labs challenge does not exist.",
      path: `/labs/${slug}`,
      index: false,
    });
  }
  return createPageMetadata({
    title: lab.name,
    description: `${lab.description} A Svigl Labs precision challenge.`,
    path: `/labs/${lab.slug}`,
  });
}

export default async function LabPage({ params }: LabPageProps) {
  const { lab: slug } = await params;
  if (!isLabSlug(slug)) notFound();
  const lab = getLabBySlug(slug);
  if (!lab) notFound();
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Svigl", path: "/" },
          { name: "Labs", path: "/labs" },
          { name: lab.name, path: `/labs/${lab.slug}` },
        ])}
      />
      <LabDetailView lab={lab} />
    </>
  );
}
