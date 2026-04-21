import Image from "next/image";
import { DashboardMockup } from "./mockups";

type Props = {
  /** Optional real screenshot path (e.g. `/landing/dashboard-hero.png`). */
  imageSrc?: string;
  imageAlt?: string;
  /** Forwarded to `next/image` when `imageSrc` is set. */
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
};

/**
 * Renders the landing dashboard illustration.
 *
 * - Default: pure JSX/Tailwind mockup (no external asset).
 * - If `imageSrc` is passed, renders an optimized <Image> instead.
 *   This lets us swap in a real product screenshot later without touching
 *   any other part of the landing.
 */
export function DashboardShowcase({
  imageSrc,
  imageAlt = "Anteprima dashboard RistoSimply",
  width = 1600,
  height = 1000,
  priority = false,
  className,
}: Props) {
  if (imageSrc) {
    return (
      <div className={`relative overflow-hidden rounded-[26px] border border-white/10 shadow-landing-card ${className ?? ""}`}>
        <Image
          src={imageSrc}
          alt={imageAlt}
          width={width}
          height={height}
          priority={priority}
          className="h-auto w-full"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <DashboardMockup />
    </div>
  );
}
