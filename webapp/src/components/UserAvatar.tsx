import Image from "next/image";

type UserAvatarProps = {
  name?: string | null;
  email?: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-xl",
};

function initials(name?: string | null, email?: string) {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }
  return (email?.[0] ?? "?").toUpperCase();
}

export function UserAvatar({
  name,
  email,
  avatarUrl,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const sizeClass = SIZES[size];

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name ?? email ?? "Profile"}
        width={size === "lg" ? 80 : size === "md" ? 48 : 32}
        height={size === "lg" ? 80 : size === "md" ? 48 : 32}
        className={`rounded-full object-cover ${sizeClass} ${className}`}
        unoptimized
      />
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-navy font-bold text-white ${sizeClass} ${className}`}
      aria-hidden="true"
    >
      {initials(name, email)}
    </span>
  );
}
