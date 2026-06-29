import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export const aiControlAuditRepository = {
  async record(params: {
    tenantId?: string | null;
    actorId: string;
    actorRole: string;
    actorEmail?: string;
    agentId?: string;
    operation: string;
    entityType: string;
    entityId?: string;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string;
  }) {
    return prisma.aiControlAuditLog.create({
      data: {
        id: randomUUID(),
        tenantId: params.tenantId ?? null,
        actorId: params.actorId,
        actorRole: params.actorRole,
        actorEmail: params.actorEmail,
        agentId: params.agentId,
        operation: params.operation,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValue: params.oldValue as Prisma.InputJsonValue,
        newValue: params.newValue as Prisma.InputJsonValue,
        ipAddress: params.ipAddress,
      },
    });
  },

  async list(params: { tenantId?: string | null; limit?: number }) {
    return prisma.aiControlAuditLog.findMany({
      where: params.tenantId ? { tenantId: params.tenantId } : {},
      orderBy: { createdAt: "desc" },
      take: params.limit ?? 100,
    });
  },
};

export const aiAgentRepository = {
  async list(tenantId?: string | null) {
    return prisma.aiAgent.findMany({
      where: tenantId ? { tenantId } : {},
      include: { tenant: { select: { name: true } } },
      orderBy: [{ tenantId: "asc" }, { name: "asc" }],
    });
  },

  async getById(id: string) {
    return prisma.aiAgent.findUnique({ where: { id }, include: { tenant: { select: { name: true } } } });
  },

  async create(data: Prisma.AiAgentCreateInput) {
    return prisma.aiAgent.create({ data });
  },

  async update(id: string, data: Prisma.AiAgentUpdateInput) {
    return prisma.aiAgent.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.aiAgent.delete({ where: { id } });
  },
};

export const aiPromptRepository = {
  async list(tenantId?: string | null) {
    return prisma.aiPromptTemplate.findMany({
      where: tenantId !== undefined ? { OR: [{ tenantId }, { tenantId: null }] } : {},
      orderBy: { updatedAt: "desc" },
    });
  },

  async getById(id: string) {
    return prisma.aiPromptTemplate.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: "desc" } } },
    });
  },

  async create(data: Prisma.AiPromptTemplateCreateInput) {
    return prisma.aiPromptTemplate.create({ data });
  },

  async updateWithVersion(params: {
    id: string;
    content: string;
    systemPrompt: string;
    changeNote?: string;
    updatedBy?: string;
  }) {
    const existing = await prisma.aiPromptTemplate.findUniqueOrThrow({ where: { id: params.id } });
    const nextVersion = existing.version + 1;
    return prisma.$transaction(async (tx) => {
      await tx.aiPromptVersion.create({
        data: {
          templateId: existing.id,
          version: nextVersion,
          content: params.content,
          systemPrompt: params.systemPrompt,
          changeNote: params.changeNote,
          createdBy: params.updatedBy,
        },
      });
      return tx.aiPromptTemplate.update({
        where: { id: params.id },
        data: {
          content: params.content,
          systemPrompt: params.systemPrompt,
          version: nextVersion,
          updatedBy: params.updatedBy,
        },
      });
    });
  },

  async rollback(templateId: string, version: number, updatedBy?: string) {
    const snap = await prisma.aiPromptVersion.findUnique({
      where: { templateId_version: { templateId, version } },
    });
    if (!snap) throw new Error("Versione non trovata");
    return aiPromptRepository.updateWithVersion({
      id: templateId,
      content: snap.content,
      systemPrompt: snap.systemPrompt,
      changeNote: `Rollback a v${version}`,
      updatedBy,
    });
  },

  async duplicate(id: string, newKey: string, tenantId?: string | null) {
    const src = await prisma.aiPromptTemplate.findUniqueOrThrow({ where: { id } });
    return prisma.aiPromptTemplate.create({
      data: {
        tenantId: tenantId ?? src.tenantId,
        key: newKey,
        name: `${src.name} (copy)`,
        module: src.module,
        description: src.description,
        content: src.content,
        systemPrompt: src.systemPrompt,
        tags: src.tags as Prisma.InputJsonValue,
        createdBy: src.updatedBy,
      },
    });
  },

  exportJson(templates: Array<{ key: string; name: string; module: string; content: string; systemPrompt: string; tags: unknown }>) {
    return JSON.stringify({ exportedAt: new Date().toISOString(), templates }, null, 2);
  },
};

export const aiMarketplaceRepository = {
  async ensureCatalog() {
    const count = await prisma.aiMarketplaceAgent.count();
    if (count > 0) return;
    const catalog = [
      { slug: "sommelier-ai", name: "Sommelier AI", module: "cantina", category: "beverage", description: "Esperto carta vini e abbinamenti." },
      { slug: "chef-ai", name: "Chef AI", module: "kitchen", category: "kitchen", description: "Assistente cucina professionale." },
      { slug: "michelin-ai", name: "Michelin AI", module: "supervisor", category: "quality", description: "Standard qualità e fine dining." },
      { slug: "spa-ai", name: "Spa AI", module: "hotel", category: "wellness", description: "Gestione spa e trattamenti." },
      { slug: "hotel-ai-pro", name: "Hotel AI", module: "hotel", category: "hotel", description: "Front office e concierge avanzato." },
      { slug: "revenue-ai-pro", name: "Revenue AI Pro", module: "dashboard", category: "revenue", description: "Revenue management avanzato." },
      { slug: "marketing-ai", name: "Marketing AI", module: "crm", category: "marketing", description: "Campagne e CRM marketing." },
      { slug: "legal-ai", name: "Legal AI", module: "general", category: "legal", description: "Contratti e compliance." },
      { slug: "hr-ai", name: "HR AI", module: "staff", category: "hr", description: "Risorse umane e turni." },
      { slug: "translate-ai", name: "Traduzioni AI", module: "reception", category: "i18n", description: "Traduzioni multilingua ospiti." },
    ];
    for (const item of catalog) {
      await prisma.aiMarketplaceAgent.create({
        data: {
          slug: item.slug,
          name: item.name,
          module: item.module,
          category: item.category,
          description: item.description,
          systemPrompt: `Sei ${item.name} per RistoSimply.`,
        },
      });
    }
  },

  async listWithInstalls(tenantId?: string | null) {
    await aiMarketplaceRepository.ensureCatalog();
    const agents = await prisma.aiMarketplaceAgent.findMany({ where: { active: true }, orderBy: { name: "asc" } });
    const installs = tenantId
      ? await prisma.aiTenantMarketplaceAgent.findMany({ where: { tenantId, active: true } })
      : await prisma.aiTenantMarketplaceAgent.findMany({ where: { active: true } });
    const installSet = new Set(installs.map((i) => i.marketplaceId));
    return agents.map((a) => ({ ...a, installed: installSet.has(a.id) }));
  },

  async install(tenantId: string, marketplaceId: string, installedBy?: string) {
    const catalog = await prisma.aiMarketplaceAgent.findUniqueOrThrow({ where: { id: marketplaceId } });
    const join = await prisma.aiTenantMarketplaceAgent.upsert({
      where: { tenantId_marketplaceId: { tenantId, marketplaceId } },
      update: { active: true, installedBy },
      create: { tenantId, marketplaceId, installedBy, active: true },
    });

    await prisma.aiAgent.upsert({
      where: { tenantId_slug: { tenantId, slug: catalog.slug } },
      update: {
        active: true,
        name: catalog.name,
        description: catalog.description,
        module: catalog.module,
        provider: catalog.provider,
        model: catalog.model,
        systemPrompt: catalog.systemPrompt,
        prompt: catalog.prompt || catalog.description,
      },
      create: {
        id: randomUUID(),
        tenantId,
        slug: catalog.slug,
        name: catalog.name,
        description: catalog.description,
        module: catalog.module,
        provider: catalog.provider,
        model: catalog.model,
        systemPrompt: catalog.systemPrompt,
        prompt: catalog.prompt || catalog.description,
        active: true,
      },
    });

    return join;
  },

  async uninstall(tenantId: string, marketplaceId: string) {
    const catalog = await prisma.aiMarketplaceAgent.findUnique({ where: { id: marketplaceId } });
    const join = await prisma.aiTenantMarketplaceAgent.update({
      where: { tenantId_marketplaceId: { tenantId, marketplaceId } },
      data: { active: false },
    });

    if (catalog) {
      await prisma.aiAgent.updateMany({
        where: { tenantId, slug: catalog.slug },
        data: { active: false },
      });
    }

    return join;
  },
};
