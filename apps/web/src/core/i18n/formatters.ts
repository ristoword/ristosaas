"use client";

import { useMemo } from "react";
import { useI18n } from "@/core/i18n/provider";

const localeMap = {
  it: "it-IT",
  en: "en-US",
  nl: "nl-NL",
} as const;

export function useI10n() {
  const { locale } = useI18n();
  const resolvedLocale = localeMap[locale];

  return useMemo(() => {
    const date = new Intl.DateTimeFormat(resolvedLocale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const shortDate = new Intl.DateTimeFormat(resolvedLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const dateTime = new Intl.DateTimeFormat(resolvedLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const currency = new Intl.NumberFormat(resolvedLocale, {
      style: "currency",
      currency: "EUR",
    });
    const number = new Intl.NumberFormat(resolvedLocale);

    return {
      locale: resolvedLocale,
      formatDate: (value: Date | string) => date.format(typeof value === "string" ? new Date(value) : value),
      formatShortDate: (value: Date | string) => shortDate.format(typeof value === "string" ? new Date(value) : value),
      formatDateTime: (value: Date | string) => dateTime.format(typeof value === "string" ? new Date(value) : value),
      formatCurrency: (value: number) => currency.format(value),
      formatNumber: (value: number) => number.format(value),
    };
  }, [resolvedLocale]);
}
