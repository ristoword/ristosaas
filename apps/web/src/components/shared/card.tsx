import { cn } from "@/lib/utils";

type CardProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
};

export function Card({ title, description, children, className, headerRight }: CardProps) {
  return (
    <div className={cn("rounded-2xl border border-rw-line bg-rw-surface", className)}>
      {(title || headerRight) && (
        <div className="flex items-start justify-between gap-3 border-b border-rw-line px-5 py-4">
          <div>
            {title && <h3 className="font-display text-base font-semibold text-rw-ink">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-rw-muted">{description}</p>}
          </div>
          {headerRight}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}
