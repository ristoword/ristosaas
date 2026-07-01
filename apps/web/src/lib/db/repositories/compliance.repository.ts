import { prisma } from "@/lib/db/prisma";

export type ComplianceConfig = {
  alloggiatiEnabled: boolean;
  alloggiatiUsername: string;
  alloggiatiPassword: string;
  alloggiatiWsKey: string;
  alloggiatiApartmentId: string;
  fiscalEnabled: boolean;
  fiscalVatNumber: string;
  fiscalBusinessName: string;
  fiscalPec: string;
  fiscalSdiRecipientCode: string;
  fiscalRegimeFiscale: string;
  lockEnabled: boolean;
  lockVendor: string;
  lockBridgeUrl: string;
  lockBridgeApiKey: string;
  autoPrintOrders: boolean;
  autoPrintBillClose: boolean;
};

const DEFAULTS: ComplianceConfig = {
  alloggiatiEnabled: false,
  alloggiatiUsername: "",
  alloggiatiPassword: "",
  alloggiatiWsKey: "",
  alloggiatiApartmentId: "",
  fiscalEnabled: false,
  fiscalVatNumber: "",
  fiscalBusinessName: "",
  fiscalPec: "",
  fiscalSdiRecipientCode: "0000000",
  fiscalRegimeFiscale: "RF01",
  lockEnabled: false,
  lockVendor: "generic",
  lockBridgeUrl: "",
  lockBridgeApiKey: "",
  autoPrintOrders: true,
  autoPrintBillClose: true,
};

function mapRow(row: {
  alloggiatiEnabled: boolean;
  alloggiatiUsername: string;
  alloggiatiPassword: string;
  alloggiatiWsKey: string;
  alloggiatiApartmentId: string;
  fiscalEnabled: boolean;
  fiscalVatNumber: string;
  fiscalBusinessName: string;
  fiscalPec: string;
  fiscalSdiRecipientCode: string;
  fiscalRegimeFiscale: string;
  lockEnabled: boolean;
  lockVendor: string;
  lockBridgeUrl: string;
  lockBridgeApiKey: string;
  autoPrintOrders: boolean;
  autoPrintBillClose: boolean;
}): ComplianceConfig {
  return { ...row };
}

export const complianceRepository = {
  async get(tenantId: string): Promise<ComplianceConfig> {
    const row = await prisma.tenantComplianceConfig.findUnique({ where: { tenantId } });
    return row ? mapRow(row) : { ...DEFAULTS };
  },

  async upsert(tenantId: string, data: Partial<ComplianceConfig>): Promise<ComplianceConfig> {
    const row = await prisma.tenantComplianceConfig.upsert({
      where: { tenantId },
      create: { tenantId, ...DEFAULTS, ...data },
      update: data,
    });
    return mapRow(row);
  },
};
