import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LabDetailView, getAllLabs, getLabBySlug, isLabSlug } from "@/features/labs";

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
    return { title: "Lab not found — Svigl Labs" };
  }
  return {
    title: `${lab.name} — Svigl Labs`,
    description: lab.description,
  };
}

export default async function LabPage({ params }: LabPageProps) {
  const { lab: slug } = await params;
  if (!isLabSlug(slug)) notFound();
  const lab = getLabBySlug(slug);
  if (!lab) notFound();
  return <LabDetailView lab={lab} />;
}
