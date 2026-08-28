import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg" | "xl";

const AVATAR_GRADIENTS = [
  { key: "amber", style: "linear-gradient(135deg,#E7A13A,#B07310)" },
  { key: "rose", style: "linear-gradient(135deg,#E07B6F,#A4453A)" },
  { key: "violet", style: "linear-gradient(135deg,#8C7BD9,#5A4A9D)" },
  { key: "teal", style: "linear-gradient(135deg,#3CB59C,#1F7363)" },
  { key: "blue", style: "linear-gradient(135deg,#5A9DEE,#2C6BC0)" },
  { key: "green", style: "linear-gradient(135deg,#62B870,#2F7D3D)" },
  { key: "coral", style: "linear-gradient(135deg,#E08A4F,#A85522)" },
  { key: "plum", style: "linear-gradient(135deg,#B36DA8,#7A3F70)" },
] as const;

const sizeMap: Record<AvatarSize, { box: string; text: string }> = {
  sm: { box: "h-7 w-7", text: "text-[11px]" },
  md: { box: "h-9 w-9", text: "text-[13px]" },
  lg: { box: "h-12 w-12", text: "text-[16px]" },
  xl: { box: "h-16 w-16 md:h-[72px] md:w-[72px]", text: "text-[22px] md:text-[26px]" },
};

interface AvatarProps {
  name: string;
  size?: AvatarSize;
  className?: string;
}

/**
 * Avatar com 8 gradientes determinísticos pelo nome (`.av-*`).
 * Initial em mono semibold, sem cor de fonte (herda branco do gradient).
 * Especificação `studoo.css` linhas 684-691.
 */
export const Avatar = ({ name, size = "md", className }: AvatarProps) => {
  const initial = (name?.trim().charAt(0) || "?").toUpperCase();
  const idx = hashName(name) % AVATAR_GRADIENTS.length;
  const gradient = AVATAR_GRADIENTS[idx].style;
  const { box, text } = sizeMap[size];

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full shrink-0 select-none",
        "font-mono font-semibold text-white/95",
        box,
        text,
        className,
      )}
      style={{ background: gradient }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
};

function hashName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash;
}
