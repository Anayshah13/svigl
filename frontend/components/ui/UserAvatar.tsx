import { avatarBackgroundColor, avatarInitial, avatarTextColor } from "@/lib/avatar";
import { cn } from "@/lib/cn";
import { RobotAvatar } from "./RobotAvatar";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  isBot?: boolean;
}

export function UserAvatar({ name, avatarUrl, className, isBot }: UserAvatarProps) {
  if (isBot) {
    return <RobotAvatar name={name} className={className} />;
  }

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt="" className={cn("rounded-full object-cover", className)} />
    );
  }

  const backgroundColor = avatarBackgroundColor(name);

  return (
    <div
      className={cn("flex items-center justify-center rounded-full font-bold", className)}
      style={{ backgroundColor, color: avatarTextColor(backgroundColor) }}
    >
      {avatarInitial(name)}
    </div>
  );
}
