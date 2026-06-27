export {
  recordSupervisorFeedback,
  listFeedback,
  extractModuleFromProposal,
  extractConfidenceFromProposal,
  extractDecisionFromProposal,
  extractMotivoFromProposal,
  isLearningEnabled,
} from "@/lib/ai/learning/feedback";
export type { LearningFeedbackRecord, FeedbackOutcome } from "@/lib/ai/learning/feedback";

export {
  tokenizeForLearning,
  extractSignals,
  buildPatternKey,
  buildPatternFromFeedback,
  aggregatePatterns,
  matchPatterns,
  approvalRate,
} from "@/lib/ai/learning/patterns";
export type { LearningPatternRecord, FeedbackForPattern } from "@/lib/ai/learning/patterns";

export {
  computeModuleStats,
  computeTenantStats,
  patternStrength,
  getTenantLearningStats,
  countFeedbackSinceTrain,
} from "@/lib/ai/learning/statistics";
export type { ModuleFeedbackStats, TenantLearningStats } from "@/lib/ai/learning/statistics";

export {
  optimizeDecision,
  optimizeDecisions,
  computeAdjustmentFromPattern,
  buildLearnedContextForEnrich,
  MIN_SIMILAR_APPROVALS,
  MIN_APPROVAL_RATE,
} from "@/lib/ai/learning/optimizer";
export type { LearningAdjustment } from "@/lib/ai/learning/optimizer";

export {
  trainModulePatterns,
  trainTenant,
  getLearnedPatterns,
  getLearnedContextBlock,
} from "@/lib/ai/learning/trainer";
export type { TrainingResult } from "@/lib/ai/learning/trainer";
