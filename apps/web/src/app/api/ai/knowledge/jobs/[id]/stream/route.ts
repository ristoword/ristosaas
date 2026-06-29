import { NextRequest } from "next/server";
import { err } from "@/lib/api/helpers";
import { requireApiUser } from "@/lib/auth/guards";
import { canReadKnowledge } from "@/lib/ai/knowledge/access";
import { subscribeIndexingJob } from "@/lib/ai/rag/indexing-service";
import { knowledgeRepository } from "@/lib/db/repositories/knowledge.repository";
import { createSseResponse } from "@/lib/ai/sse";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const guard = await requireApiUser(req);
  if (guard.error) return guard.error;
  if (!canReadKnowledge(guard.user!)) return err("Forbidden", 403);

  const { id } = await ctx.params;
  const job = await knowledgeRepository.getJob(id);
  if (!job) return err("Job not found", 404);

  return createSseResponse(async (emit, signal) => {
    emit({ type: "status", message: `Job ${job.status}` });
    emit({
      type: "meta",
      data: {
        jobId: job.id,
        status: job.status,
        progressPct: job.progressPct,
        chunksDone: job.chunksDone,
        chunksTotal: job.chunksTotal,
      },
    });

    if (job.status === "completed" || job.status === "failed") {
      emit({ type: "meta", data: { jobId: job.id, status: job.status, done: true } });
      return;
    }

    const unsubscribe = subscribeIndexingJob(id, (event) => {
      emit({
        type: "meta",
        data: event,
      });
      if (event.type === "done" || event.type === "error") {
        emit({ type: "meta", data: { ...event, done: true } });
      }
    });

    const interval = setInterval(async () => {
      const fresh = await knowledgeRepository.getJob(id);
      if (!fresh) return;
      emit({
        type: "meta",
        data: {
          jobId: fresh.id,
          status: fresh.status,
          progressPct: fresh.progressPct,
          chunksDone: fresh.chunksDone,
          chunksTotal: fresh.chunksTotal,
        },
      });
      if (fresh.status === "completed" || fresh.status === "failed") {
        clearInterval(interval);
        unsubscribe();
        emit({ type: "meta", data: { jobId: fresh.id, status: fresh.status, done: true } });
      }
    }, 2000);

    req.signal.addEventListener("abort", () => {
      clearInterval(interval);
      unsubscribe();
    });

    await new Promise<void>((resolve) => {
      signal.addEventListener("abort", () => resolve(), { once: true });
    });
  }, req.signal);
}
