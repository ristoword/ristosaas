import { Suspense } from "react";
import { AiAssistentePage } from "@/components/ai/ai-assistente-page";

export default function AiAssistenteRoute() {
  return (
    <Suspense fallback={null}>
      <AiAssistentePage />
    </Suspense>
  );
}
