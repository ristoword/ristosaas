import { AlertTriangle } from "lucide-react";

type MockPreviewBannerProps = {
  title?: string;
  children?: React.ReactNode;
};

export function MockPreviewBanner({
  title = "Anteprima interna",
  children,
}: MockPreviewBannerProps) {
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        <p className="text-amber-200/90">
          {children ??
            "Questa pagina mostra dati di esempio. Non riflette il tenant corrente e non è collegata a un backend dedicato."}
        </p>
      </div>
    </div>
  );
}
