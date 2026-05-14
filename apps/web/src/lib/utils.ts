import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const QR_API_BASE = "https://api.qrserver.com/v1/create-qr-code/";

export function qrImageUrl(data: string, size = 180, margin = 10): string {
  return `${QR_API_BASE}?size=${size}x${size}&margin=${margin}&data=${encodeURIComponent(data)}`;
}
