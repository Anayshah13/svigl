import type { Metadata } from "next";
import { ProfileView } from "@/features/profile/ProfileView";
import { formatDisplayName } from "@/lib/names";
import { createPageMetadata } from "@/lib/seo";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  const display = formatDisplayName(decoded.replace(/-/g, " "));
  return createPageMetadata({
    title: `${display}’s profile`,
    description: `${display} on Svigl, the multiplayer SVG drawing game by Anay Shah.`,
    path: `/profile/${decoded}`,
    index: false,
  });
}

export default async function ProfileUsernamePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  return <ProfileView username={decoded} />;
}
