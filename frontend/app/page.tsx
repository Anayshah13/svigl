import { HomeGate } from "@/features/auth/HomeGate";
import { createPageMetadata, DEFAULT_DESCRIPTION, DEFAULT_TITLE } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  path: "/",
  ogTitle: DEFAULT_TITLE,
  absoluteTitle: true,
});

export default function Home() {
  return <HomeGate />;
}
