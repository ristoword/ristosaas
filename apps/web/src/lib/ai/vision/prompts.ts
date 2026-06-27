import type { VisionTaskType } from "@/lib/ai/vision/types";

const JSON_SCHEMA_HINT: Record<VisionTaskType, string> = {
  invoice: `{
  "confidence": 0.0-1.0,
  "summary": "string",
  "warnings": ["string"],
  "document": {
    "supplierName": "string|null", "documentNumber": "string|null", "documentDate": "YYYY-MM-DD|null",
    "totalAmount": number|null, "currency": "EUR", "taxAmount": number|null, "notes": "string|null",
    "lineItems": [{ "description": "string", "quantity": number|null, "unit": "string|null",
      "unitPrice": number|null, "totalPrice": number|null, "sku": "string|null",
      "lotNumber": "string|null", "expiryDate": "YYYY-MM-DD|null" }]
  }
}`,
  ddt: `{
  "confidence": 0.0-1.0, "summary": "string", "warnings": ["string"],
  "document": {
    "supplierName": "string|null", "documentNumber": "string|null", "documentDate": "YYYY-MM-DD|null",
    "totalAmount": null, "currency": "EUR", "taxAmount": null, "notes": "string|null",
    "lineItems": [{ "description": "string", "quantity": number|null, "unit": "string|null",
      "unitPrice": null, "totalPrice": null, "sku": "string|null", "lotNumber": "string|null", "expiryDate": "YYYY-MM-DD|null" }]
  }
}`,
  supplier_price_list: `{
  "confidence": 0.0-1.0, "summary": "string", "warnings": ["string"],
  "document": {
    "supplierName": "string|null", "documentNumber": null, "documentDate": "YYYY-MM-DD|null",
    "totalAmount": null, "currency": "EUR", "taxAmount": null, "notes": "string|null",
    "lineItems": [{ "description": "string", "quantity": null, "unit": "string|null",
      "unitPrice": number|null, "totalPrice": null, "sku": "string|null", "lotNumber": null, "expiryDate": null }]
  }
}`,
  product_recognition: `{
  "confidence": 0.0-1.0, "summary": "string", "warnings": ["string"],
  "products": [{ "name": "string|null", "brand": "string|null", "category": "string|null",
    "quantity": number|null, "unit": "string|null", "barcode": "string|null",
    "allergens": ["string"], "ingredients": ["string"], "expiryDate": "YYYY-MM-DD|null",
    "lotNumber": "string|null", "storageInstructions": "string|null" }]
}`,
  label_recognition: `{
  "confidence": 0.0-1.0, "summary": "string", "warnings": ["string"],
  "products": [{ "name": "string|null", "brand": "string|null", "category": "string|null",
    "quantity": number|null, "unit": "string|null", "barcode": "string|null",
    "allergens": ["string"], "ingredients": ["string"], "expiryDate": "YYYY-MM-DD|null",
    "lotNumber": "string|null", "storageInstructions": "string|null" }]
}`,
  paper_menu: `{
  "confidence": 0.0-1.0, "summary": "string", "warnings": ["string"],
  "menuItems": [{ "name": "string", "category": "string|null", "price": number|null,
    "currency": "EUR", "description": "string|null", "allergens": ["string"] }]
}`,
  plating_verification: `{
  "confidence": 0.0-1.0, "summary": "string", "warnings": ["string"],
  "plating": {
    "dishName": "string|null", "presentationScore": 1-10|null,
    "portionConsistency": "ok|under|over|unknown", "garnishPresent": boolean|null,
    "cleanlinessScore": 1-10|null, "issues": ["string"], "suggestions": ["string"]
  }
}`,
  haccp_photo: `{
  "confidence": 0.0-1.0, "summary": "string", "warnings": ["string"],
  "haccp": {
    "checkType": "string|null", "location": "string|null", "temperatureC": number|null,
    "visualConformity": boolean|null, "hygieneIssues": ["string"],
    "correctiveActions": ["string"], "riskLevel": "low|medium|high|unknown"
  }
}`,
};

const TASK_INSTRUCTIONS: Record<VisionTaskType, string> = {
  invoice: "Estrai tutti i dati della fattura fornitore: intestazione, righe, importi, IVA, date.",
  ddt: "Estrai dati del Documento di Trasporto: mittente, numero, date, righe merce con quantità e lotti.",
  supplier_price_list: "Estrai listino prezzi fornitore: articoli, unità di misura, prezzi unitari.",
  product_recognition: "Identifica prodotti alimentari visibili: nome, marca, categoria, quantità stimata.",
  label_recognition: "Leggi etichetta prodotto: ingredienti, allergeni, lotti, scadenze, barcode se visibile.",
  paper_menu: "Trascrivi menu cartaceo: piatti, categorie, prezzi, descrizioni, allergeni indicati.",
  plating_verification: "Valuta impiattamento: nome piatto stimato, presentazione, porzioni, guarnizione, igiene visiva.",
  haccp_photo: "Analizza foto per controllo HACCP: tipo controllo, conformità visiva, rischi igienici, azioni correttive.",
};

export function buildVisionPrompt(taskType: VisionTaskType, locale: string, hints?: string): string {
  const lang = locale.startsWith("en") ? "English" : "italiano";
  return [
    `Sei Vision AI di RistoSimply. Analizza l'immagine per: ${TASK_INSTRUCTIONS[taskType]}`,
    `Rispondi SOLO con JSON valido seguendo questo schema:`,
    JSON_SCHEMA_HINT[taskType],
    `Regole:`,
    `- Non inventare testo illeggibile; usa null e aggiungi warning.`,
    `- confidence 0-1 basata su leggibilità immagine.`,
    `- summary in ${lang}, max 2 frasi.`,
    `- warnings: problemi di lettura o dati incerti.`,
    hints ? `Contesto aggiuntivo: ${hints}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export { JSON_SCHEMA_HINT, TASK_INSTRUCTIONS };
