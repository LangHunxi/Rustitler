use serde::{Deserialize, Serialize};

// ── Typed IDs ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct BatchId(pub String);

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct FileJobId(pub String);

// ── File classification ────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum FileType {
    Docx,
    Doc,
    Pdf,
    Png,
    Jpg,
    Jpeg,
    Unsupported,
}

impl FileType {
    pub fn from_extension(ext: &str) -> Self {
        match ext.to_ascii_lowercase().as_str() {
            "docx" => Self::Docx,
            "doc" => Self::Doc,
            "pdf" => Self::Pdf,
            "png" => Self::Png,
            "jpg" => Self::Jpg,
            "jpeg" => Self::Jpeg,
            _ => Self::Unsupported,
        }
    }

    pub fn is_supported(&self) -> bool {
        !matches!(self, Self::Unsupported)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum FileStatus {
    Queued,
    Analyzing,
    OutputCreated,
    Pending,
    Skipped,
    Failed,
    Undoable,
    Cancelled,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum BatchStatus {
    Running,
    Completed,
    Cancelled,
    Failed,
}

// ── Source fingerprint ─────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceFingerprint {
    pub normalized_path: String,
    pub size_bytes: u64,
    pub modified_time: String, // ISO-8601 UTC
}

// ── Extraction types ───────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ExtractMethod {
    PdfNativeLiteparse,
    WordUndoc,
    DocConvertedUndoc,
    ImageOcrTesseract,
    PdfOcrFallbackTesseract,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SourceUnit {
    PdfPoint,
    Pixel,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NormalizedBox {
    pub x0: f32,
    pub y0: f32,
    pub x1: f32,
    pub y1: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawBox {
    pub x0: f32,
    pub y0: f32,
    pub x1: f32,
    pub y1: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutBlock {
    pub text: String,
    pub bbox: NormalizedBox,
    pub raw_bbox: Option<RawBox>,
    pub font_size: Option<f32>,
    pub bold: Option<bool>,
    pub ocr_confidence: Option<f32>,
    pub line_index: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedPage {
    pub page_index: usize,
    pub width: f32,
    pub height: f32,
    pub unit: SourceUnit,
    pub blocks: Vec<LayoutBlock>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParagraphBlock {
    pub text: String,
    pub paragraph_index: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedDocument {
    pub source_type: FileType,
    pub extract_method: ExtractMethod,
    pub pages: Vec<ExtractedPage>,
    pub paragraphs: Vec<ParagraphBlock>,
    pub diagnostics_ref: Option<String>,
}

// ── Scoring types ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeywordRule {
    pub keyword: String,
    pub score_delta: i16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegexRule {
    pub pattern: String,
    pub score_delta: i16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoringProfile {
    pub auto_output_threshold: u8,
    pub layout_sensitivity: f32,
    pub position_sensitivity: f32,
    pub keyword_sensitivity: f32,
    pub text_quality_sensitivity: f32,
    pub ocr_conservatism: f32,
    pub keyword_rules: Vec<KeywordRule>,
    pub regex_rules: Vec<RegexRule>,
}

impl Default for ScoringProfile {
    fn default() -> Self {
        Self {
            auto_output_threshold: 70,
            layout_sensitivity: 1.0,
            position_sensitivity: 1.0,
            keyword_sensitivity: 1.0,
            text_quality_sensitivity: 1.0,
            ocr_conservatism: 1.0,
            keyword_rules: vec![
                KeywordRule {
                    keyword: "关于".into(),
                    score_delta: 5,
                },
                KeywordRule {
                    keyword: "通知".into(),
                    score_delta: 5,
                },
                KeywordRule {
                    keyword: "报告".into(),
                    score_delta: 5,
                },
                KeywordRule {
                    keyword: "方案".into(),
                    score_delta: 5,
                },
                KeywordRule {
                    keyword: "制度".into(),
                    score_delta: 5,
                },
                KeywordRule {
                    keyword: "合同".into(),
                    score_delta: 5,
                },
                KeywordRule {
                    keyword: "函".into(),
                    score_delta: 3,
                },
            ],
            regex_rules: vec![],
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CandidateSource {
    PdfLayout,
    WordParagraph,
    OcrBlock,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryScores {
    pub layout: i16,
    pub position: i16,
    pub keyword: i16,
    pub text_quality: i16,
    pub penalty: i16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleDetail {
    pub rule_name: String,
    pub category: String,
    pub delta: i16,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CandidateTitle {
    pub text: String,
    pub source: CandidateSource,
    pub page_index: Option<usize>,
    pub paragraph_index: Option<usize>,
    pub score: u8,
    pub category_scores: CategoryScores,
    pub rule_details: Vec<RuleDetail>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ScoreDecision {
    AutoOutput,
    Pending,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoringResult {
    pub final_title: Option<String>,
    pub confidence: u8,
    pub candidates: Vec<CandidateTitle>,
    pub decision: ScoreDecision,
}

// ── IPC view types ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PendingReason {
    LowConfidence,
    ExtractionFailed,
    OcrFailed,
    DocConvertFailed,
    UnsupportedFormat,
    DuplicateSuspected,
    IoError,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileJobView {
    pub file_job_id: FileJobId,
    pub batch_id: BatchId,
    pub source_path: String,
    pub file_name: String,
    pub file_type: FileType,
    pub status: FileStatus,
    pub recognized_title: Option<String>,
    pub confidence: Option<u8>,
    pub output_path: Option<String>,
    pub failure_reason: Option<String>,
    pub pending_reason: Option<PendingReason>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchSummary {
    pub total: usize,
    pub output_created: usize,
    pub pending: usize,
    pub skipped: usize,
    pub failed: usize,
    pub cancelled: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn file_type_from_extension() {
        assert_eq!(FileType::from_extension("pdf"), FileType::Pdf);
        assert_eq!(FileType::from_extension("PDF"), FileType::Pdf);
        assert_eq!(FileType::from_extension("docx"), FileType::Docx);
        assert_eq!(FileType::from_extension("doc"), FileType::Doc);
        assert_eq!(FileType::from_extension("png"), FileType::Png);
        assert_eq!(FileType::from_extension("jpg"), FileType::Jpg);
        assert_eq!(FileType::from_extension("jpeg"), FileType::Jpeg);
        assert_eq!(FileType::from_extension("xlsx"), FileType::Unsupported);
        assert!(FileType::Pdf.is_supported());
        assert!(!FileType::Unsupported.is_supported());
    }

    #[test]
    fn scoring_profile_defaults() {
        let p = ScoringProfile::default();
        assert_eq!(p.auto_output_threshold, 70);
        assert!(p.keyword_rules.iter().any(|r| r.keyword == "通知"));
    }

    #[test]
    fn models_serialize_round_trip() {
        let id = BatchId("batch-001".into());
        let json = serde_json::to_string(&id).unwrap();
        let back: BatchId = serde_json::from_str(&json).unwrap();
        assert_eq!(id, back);
    }
}
