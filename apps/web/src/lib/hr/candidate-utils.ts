export const CANDIDATE_JOB_ROLES = [
  { value: "chef", label: "Chef", group: "Cucina" },
  { value: "sous_chef", label: "Sous Chef", group: "Cucina" },
  { value: "capopartita", label: "Capopartita", group: "Cucina" },
  { value: "demi_chef", label: "Demi Chef", group: "Cucina" },
  { value: "comis_cucina", label: "Comis di Cucina", group: "Cucina" },
  { value: "lavapiatti", label: "Lavapiatti", group: "Cucina" },
  { value: "inserviente", label: "Inserviente", group: "Cucina" },
  { value: "maitre", label: "Maître", group: "Sala" },
  { value: "chef_de_rang", label: "Chef de Rang", group: "Sala" },
  { value: "demi_chef_sala", label: "Demi Chef di Sala", group: "Sala" },
  { value: "comis_sala", label: "Comis di Sala", group: "Sala" },
  { value: "cameriere", label: "Cameriere", group: "Sala" },
  { value: "barman", label: "Barman", group: "Bar" },
  { value: "bartender", label: "Bartender", group: "Bar" },
  { value: "comis_bar", label: "Comis di Bar", group: "Bar" },
  { value: "capo_pizzaiolo", label: "Capo Pizzaiolo", group: "Pizzeria" },
  { value: "pizzaiolo", label: "Pizzaiolo", group: "Pizzeria" },
  { value: "comis_pizzeria", label: "Comis di Pizzeria", group: "Pizzeria" },
  { value: "cassiere", label: "Cassiere", group: "Cassa" },
  { value: "receptionist", label: "Receptionist", group: "Hotel" },
  { value: "concierge", label: "Concierge", group: "Hotel" },
  { value: "housekeeping", label: "Housekeeping", group: "Hotel" },
  { value: "supervisor", label: "Supervisor", group: "Gestione" },
  { value: "responsabile", label: "Responsabile", group: "Gestione" },
  { value: "magazziniere", label: "Magazziniere", group: "Magazzino" },
  { value: "staff", label: "Staff", group: "Altro" },
] as const;

export function roleLabel(value: string): string {
  return CANDIDATE_JOB_ROLES.find((r) => r.value === value)?.label ?? value;
}

export const CANDIDATE_STATUS_LABELS: Record<string, string> = {
  new: "Nuovo",
  screening: "Screening",
  interview: "Colloquio",
  offer: "Proposta",
  hired: "Assunto",
  rejected: "Scartato",
  archived: "Archiviato",
};

export const CANDIDATE_SOURCE_LABELS: Record<string, string> = {
  manual: "Manuale",
  email: "Email",
  paper: "CV cartaceo",
};

export async function readFileAsBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.split(",")[1]! : result;
      resolve({ base64, mimeType: file.type || "application/octet-stream" });
    };
    reader.onerror = () => reject(new Error("Lettura file non riuscita"));
    reader.readAsDataURL(file);
  });
}

export async function prepareCvUpload(file: File): Promise<{ base64: string; mimeType: string }> {
  if (!file.type.startsWith("image/") || file.size < 600_000) {
    return readFileAsBase64(file);
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxW = 1800;
      const scale = Math.min(1, maxW / Math.max(img.width, 1));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        void readFileAsBase64(file).then(resolve).catch(reject);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      resolve({ base64: dataUrl.split(",")[1]!, mimeType: "image/jpeg" });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      void readFileAsBase64(file).then(resolve).catch(reject);
    };
    img.src = url;
  });
}
