import { initials } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string | null;
  className?: string;
}

export function Avatar({ name, src, className = "h-10 w-10" }: AvatarProps) {
  return (
    <div className={`${className} shrink-0 overflow-hidden rounded-full border bg-muted`}>
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
          {initials(name)}
        </div>
      )}
    </div>
  );
}
