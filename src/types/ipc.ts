// TypeScript types — aligned with Rust DTOs in src-tauri/src/models.rs and errors.rs
// Keep in sync with Rust side when models change.

// ── Typed IDs ──────────────────────────────────────────────────────────────

export type BatchId = string;
export type FileJobId = string;

// ── Enums ──────────────────────────────────────────────────────────────────

export type FileType = "docx" | "doc" | "pdf" | "png" | "jpg" | "jpeg" | "unsupported";

export type FileStatus =
  | "queued"
  | "analyzing"
  | "outputCreated"
  | "pending"
  | "skipped"
  | "failed"
  | "undoable"
  | "cancelled";

export type BatchStatus = "running" | "completed" | "cancelled" | "failed";

export type ExtractMethod =
  | "pdfNativeLiteparse"
  | "wordUndoc"
  | "docConvertedUndoc"
  | "imageOcrTesseract"
  | "pdfOcrFallbackTesseract";

export type CandidateSource = "pdfLayout" | "wordParagraph" | "ocrBlock";

export type ScoreDecision = "autoOutput" | "pending" | "failed";

export type PendingReason =
  | "lowConfidence"
  | "extractionFailed"
  | "ocrFailed"
  | "docConvertFailed"
  | "unsupportedFormat"
  | "duplicateSuspected"
  | "ioError";

export type ProcessingStage = "ingest" | "extract" | "score" | "rename" | "history" | "undo";

export type ErrorCode =
  | "unsupportedFormat"
  | "fileReadFailed"
  | "permissionDenied"
  | "pdfExtractFailed"
  | "pdfOcrFallbackFailed"
  | "ocrEngineFailed"
  | "docConvertFailed"
  | "wordExtractFailed"
  | "noTrustedTitle"
  | "confidenceBelowThreshold"
  | "duplicateSuspected"
  | "outputDirectoryCreateFailed"
  | "fileCopyFailed"
  | "sanitizedNameEmpty"
  | "undoOutputMissing"
  | "undoOutputModified"
  | "cancelled"
  | "internal";

// ── Core models ────────────────────────────────────────────────────────────

export interface AppErrorView {
  code: ErrorCode;
  userMessage: string;
  technicalDetail?: string;
  retryable: boolean;
  filePath?: string;
  stage?: ProcessingStage;
}

export interface CategoryScores {
  layout: number;
  position: number;
  keyword: number;
  textQuality: number;
  penalty: number;
}

export interface RuleDetail {
  ruleName: string;
  category: string;
  delta: number;
  description: string;
}

export interface CandidateTitle {
  text: string;
  source: CandidateSource;
  pageIndex?: number;
  paragraphIndex?: number;
  score: number;
  categoryScores: CategoryScores;
  ruleDetails: RuleDetail[];
}

export interface ScoringResultView {
  finalTitle?: string;
  confidence: number;
  candidates: CandidateTitle[];
  decision: ScoreDecision;
}

export interface FileJobView {
  fileJobId: FileJobId;
  batchId: BatchId;
  sourcePath: string;
  fileName: string;
  fileType: FileType;
  status: FileStatus;
  recognizedTitle?: string;
  confidence?: number;
  outputPath?: string;
  failureReason?: string;
  pendingReason?: PendingReason;
}

export interface BatchSummary {
  total: number;
  outputCreated: number;
  pending: number;
  skipped: number;
  failed: number;
  cancelled: number;
}

export interface BatchState {
  batchId: BatchId;
  createdAt: string;
  status: BatchStatus;
  settingsSnapshotId: string;
  files: FileJobView[];
  summary: BatchSummary;
}

// ── Events ─────────────────────────────────────────────────────────────────

export type BatchEvent =
  | { type: "BatchStarted"; batchId: BatchId; createdAt: string; totalFiles: number }
  | { type: "FileQueued"; batchId: BatchId; file: FileJobView }
  | { type: "FileProgress"; batchId: BatchId; fileJobId: FileJobId; stage: ProcessingStage; progress?: number }
  | { type: "FileExtracted"; batchId: BatchId; fileJobId: FileJobId; extractMethod: ExtractMethod }
  | { type: "FileScored"; batchId: BatchId; fileJobId: FileJobId; result: ScoringResultView }
  | { type: "FileOutputCreated"; batchId: BatchId; fileJobId: FileJobId; outputPath: string }
  | { type: "FilePending"; batchId: BatchId; fileJobId: FileJobId; reason: PendingReason; suggestion?: string }
  | { type: "FileSkipped"; batchId: BatchId; fileJobId: FileJobId; reason: string }
  | { type: "FileFailed"; batchId: BatchId; fileJobId: FileJobId; error: AppErrorView }
  | { type: "BatchCompleted"; batchId: BatchId; summary: BatchSummary }
  | { type: "BatchCancelled"; batchId: BatchId; summary: BatchSummary }
  | { type: "BatchError"; batchId: BatchId; error: AppErrorView };

// ── Command results ────────────────────────────────────────────────────────

export interface KeywordRule { keyword: string; scoreDelta: number }
export interface RegexRule    { pattern: string; scoreDelta: number }

export interface Settings {
  version: number;
  autoOutputThreshold: number;
  layoutSensitivity: number;
  positionSensitivity: number;
  keywordSensitivity: number;
  textQualitySensitivity: number;
  ocrConservatism: number;
  keywordRules: KeywordRule[];
  regexRules: RegexRule[];
  debugMode: boolean;
}

export interface HistoryBatchPage {
  batches: HistoryBatchRow[];
  total: number;
}

export interface HistoryBatchRow {
  batchId: BatchId;
  createdAt: string;
  status: BatchStatus;
  summary: BatchSummary;
}

export interface HistoryBatchDetail {
  batchId: BatchId;
  createdAt: string;
  status: BatchStatus;
  files: FileJobView[];
}

export interface UndoResult {
  deleted: number;
  skippedMissing: number;
  skippedModified: number;
}
