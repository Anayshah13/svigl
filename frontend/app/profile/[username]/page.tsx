import { ProfileView } from "@/features/profile/ProfileView";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function ProfileUsernamePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  return <ProfileView username={decoded} />;
}
