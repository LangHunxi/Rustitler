use crate::errors::{AppError, ErrorCategory, ErrorCode, ProcessingStage};
use std::ffi::{OsStr, OsString};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

const OUTPUT_DIR_NAME: &str = "Rustitler 输出";
const TEMP_EXTENSION: &str = "rustitler.tmp";

pub fn output_directory_for_source(source_path: &Path) -> Result<PathBuf, AppError> {
    let parent = source_path.parent().ok_or_else(|| {
        AppError::internal("source path has no parent directory")
            .with_path(source_path.display().to_string())
            .with_stage(ProcessingStage::Rename)
    })?;

    Ok(parent.join(OUTPUT_DIR_NAME))
}

pub fn sanitize_title(title: &str) -> Result<String, AppError> {
    let mut sanitized = String::new();
    let mut pending_space = false;
    let mut has_content = false;

    for ch in title.chars() {
        if ch.is_whitespace() {
            pending_space = true;
        } else if is_absolute_illegal_char(ch) {
            if pending_space && !sanitized.is_empty() {
                sanitized.push(' ');
            }
            pending_space = false;
            sanitized.push('_');
        } else {
            if pending_space && !sanitized.is_empty() {
                sanitized.push(' ');
            }
            pending_space = false;
            sanitized.push(ch);
            if ch != '.' {
                has_content = true;
            }
        }
    }

    let sanitized = sanitized
        .trim_matches(|ch: char| ch == ' ' || ch == '.')
        .to_string();
    if sanitized.is_empty() || !has_content {
        return Err(sanitized_name_empty_error());
    }

    if is_reserved_windows_name(&sanitized) {
        Ok(format!("_{sanitized}"))
    } else {
        Ok(sanitized)
    }
}

pub fn create_output_copy(source_path: &Path, title: &str) -> Result<PathBuf, AppError> {
    create_output_copy_inner(source_path, title)
}

pub fn create_manual_output_copy(source_path: &Path, title: &str) -> Result<PathBuf, AppError> {
    create_output_copy_inner(source_path, title)
}

fn create_output_copy_inner(source_path: &Path, title: &str) -> Result<PathBuf, AppError> {
    let output_dir = output_directory_for_source(source_path)?;
    fs::create_dir_all(&output_dir)
        .map_err(|err| output_directory_create_failed_error(source_path, &output_dir, err))?;

    let stem = sanitize_title(title)?;
    let extension = source_extension(source_path);
    let temp_path = temporary_copy_path(&output_dir, &stem);

    fs::copy(source_path, &temp_path)
        .map_err(|err| file_copy_failed_error(source_path, &temp_path, err))?;

    finalize_temporary_copy(source_path, &temp_path, &output_dir, &stem, extension)
}

fn source_extension(source_path: &Path) -> Option<&OsStr> {
    source_path.extension()
}

fn available_output_path(output_dir: &Path, stem: &str, extension: Option<&OsStr>) -> PathBuf {
    let first_candidate = output_dir.join(candidate_file_name(stem, extension, None));
    if !first_candidate.exists() {
        return first_candidate;
    }

    for suffix in 2.. {
        let candidate = output_dir.join(candidate_file_name(stem, extension, Some(suffix)));
        if !candidate.exists() {
            return candidate;
        }
    }

    unreachable!("unbounded suffix search should always return")
}

fn candidate_file_name(stem: &str, extension: Option<&OsStr>, suffix: Option<u32>) -> OsString {
    let mut file_name = OsString::from(match suffix {
        Some(suffix) => format!("{stem} ({suffix})"),
        None => stem.to_string(),
    });

    if let Some(extension) = extension {
        file_name.push(".");
        file_name.push(extension);
    }

    file_name
}

fn temporary_copy_path(output_dir: &Path, stem: &str) -> PathBuf {
    let mut counter = 0u32;
    loop {
        let temp_stem = if counter == 0 {
            format!(".{stem}")
        } else {
            format!(".{stem}.{counter}")
        };
        let candidate = output_dir.join(candidate_file_name(
            &temp_stem,
            Some(OsStr::new(TEMP_EXTENSION)),
            None,
        ));
        if !candidate.exists() {
            return candidate;
        }
        counter += 1;
    }
}

fn finalize_temporary_copy(
    source_path: &Path,
    temp_path: &Path,
    output_dir: &Path,
    stem: &str,
    extension: Option<&OsStr>,
) -> Result<PathBuf, AppError> {
    let final_path = available_output_path(output_dir, stem, extension);
    match fs::hard_link(temp_path, &final_path) {
        Ok(()) => {
            let _ = fs::remove_file(temp_path);
            Ok(final_path)
        }
        Err(err) if err.kind() == io::ErrorKind::AlreadyExists => {
            let refreshed_path = available_output_path(output_dir, stem, extension);
            fs::hard_link(temp_path, &refreshed_path).map_err(|link_err| {
                file_copy_failed_error(source_path, &refreshed_path, link_err)
            })?;
            let _ = fs::remove_file(temp_path);
            Ok(refreshed_path)
        }
        Err(err) => {
            let _ = fs::remove_file(temp_path);
            Err(file_copy_failed_error(source_path, &final_path, err))
        }
    }
}

fn is_absolute_illegal_char(ch: char) -> bool {
    matches!(ch, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*') || ch.is_control()
}

fn is_reserved_windows_name(name: &str) -> bool {
    let stem = name.split('.').next().unwrap_or(name);
    let normalized = stem.to_ascii_uppercase();

    matches!(
        normalized.as_str(),
        "CON"
            | "PRN"
            | "AUX"
            | "NUL"
            | "COM1"
            | "COM2"
            | "COM3"
            | "COM4"
            | "COM5"
            | "COM6"
            | "COM7"
            | "COM8"
            | "COM9"
            | "LPT1"
            | "LPT2"
            | "LPT3"
            | "LPT4"
            | "LPT5"
            | "LPT6"
            | "LPT7"
            | "LPT8"
            | "LPT9"
    )
}

fn sanitized_name_empty_error() -> AppError {
    AppError {
        code: ErrorCode::SanitizedNameEmpty,
        category: ErrorCategory::Output,
        user_message: "清洗后的文件名为空，请手动输入标题。".into(),
        technical_detail: None,
        retryable: false,
        file_path: None,
        stage: Some(ProcessingStage::Rename),
    }
}

fn output_directory_create_failed_error(
    source_path: &Path,
    output_dir: &Path,
    err: io::Error,
) -> AppError {
    AppError {
        code: ErrorCode::OutputDirectoryCreateFailed,
        category: ErrorCategory::Output,
        user_message: "无法创建输出目录，请检查目录权限。".into(),
        technical_detail: Some(format!(
            "failed to create output directory '{}': {err}",
            output_dir.display()
        )),
        retryable: true,
        file_path: Some(source_path.display().to_string()),
        stage: Some(ProcessingStage::Rename),
    }
}

fn file_copy_failed_error(source_path: &Path, target_path: &Path, err: io::Error) -> AppError {
    AppError {
        code: ErrorCode::FileCopyFailed,
        category: ErrorCategory::Output,
        user_message: "无法复制文件到输出目录，请检查文件权限或磁盘空间。".into(),
        technical_detail: Some(format!(
            "failed to copy '{}' to '{}': {err}",
            source_path.display(),
            target_path.display()
        )),
        retryable: true,
        file_path: Some(source_path.display().to_string()),
        stage: Some(ProcessingStage::Rename),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::errors::ErrorCode;
    use std::fs;
    use std::path::Path;

    #[test]
    fn output_directory_sits_next_to_source_directory() {
        let source = Path::new("/tmp/input/a.pdf");
        assert_eq!(
            output_directory_for_source(source).unwrap(),
            PathBuf::from("/tmp/input/Rustitler 输出")
        );
    }

    #[test]
    fn sanitize_preserves_cjk_punctuation_and_regular_spaces() {
        assert_eq!(
            sanitize_title("《关于 项目：复盘/总结》\t2026").unwrap(),
            "《关于 项目：复盘_总结》 2026"
        );
    }

    #[test]
    fn sanitize_rejects_empty_names() {
        let err = sanitize_title("////   \t").unwrap_err();
        assert_eq!(err.code, ErrorCode::SanitizedNameEmpty);
    }

    #[test]
    fn sanitize_avoids_reserved_device_names() {
        assert_eq!(sanitize_title("CON").unwrap(), "_CON");
        assert_eq!(sanitize_title("Lpt1").unwrap(), "_Lpt1");
    }

    #[test]
    fn create_output_preserves_extension_and_copies_to_output_dir() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("source").join("old.PDF");
        fs::create_dir_all(source.parent().unwrap()).unwrap();
        fs::write(&source, b"document").unwrap();

        let output = create_output_copy(&source, "关于项目立项").unwrap();

        assert_eq!(output.file_name().unwrap(), "关于项目立项.PDF");
        assert_eq!(fs::read(&output).unwrap(), b"document");
        assert!(output.starts_with(source.parent().unwrap().join("Rustitler 输出")));
    }

    #[test]
    fn create_output_uses_incrementing_suffix_without_overwrite() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("input").join("old.pdf");
        fs::create_dir_all(source.parent().unwrap()).unwrap();
        fs::write(&source, b"new").unwrap();
        let output_dir = source.parent().unwrap().join("Rustitler 输出");
        fs::create_dir_all(&output_dir).unwrap();
        fs::write(output_dir.join("标题.pdf"), b"old 1").unwrap();
        fs::write(output_dir.join("标题 (2).pdf"), b"old 2").unwrap();

        let output = create_output_copy(&source, "标题").unwrap();

        assert_eq!(output.file_name().unwrap(), "标题 (3).pdf");
        assert_eq!(fs::read(output_dir.join("标题.pdf")).unwrap(), b"old 1");
        assert_eq!(fs::read(output_dir.join("标题 (2).pdf")).unwrap(), b"old 2");
        assert_eq!(fs::read(output).unwrap(), b"new");
    }

    #[test]
    fn manual_pending_output_reuses_same_flow() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("input").join("old.docx");
        fs::create_dir_all(source.parent().unwrap()).unwrap();
        fs::write(&source, b"doc").unwrap();

        let output = create_manual_output_copy(&source, "手动/标题").unwrap();

        assert_eq!(output.file_name().unwrap(), "手动_标题.docx");
        assert_eq!(fs::read(output).unwrap(), b"doc");
    }

    #[test]
    fn create_output_converts_missing_source_to_copy_error() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("input").join("missing.pdf");
        fs::create_dir_all(source.parent().unwrap()).unwrap();

        let err = create_output_copy(&source, "标题").unwrap_err();

        assert_eq!(err.code, ErrorCode::FileCopyFailed);
        assert_eq!(err.stage, Some(ProcessingStage::Rename));
    }

    #[test]
    fn create_output_converts_output_directory_failure() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("input").join("old.pdf");
        fs::create_dir_all(source.parent().unwrap()).unwrap();
        fs::write(&source, b"document").unwrap();
        fs::write(
            source.parent().unwrap().join("Rustitler 输出"),
            b"not a directory",
        )
        .unwrap();

        let err = create_output_copy(&source, "标题").unwrap_err();

        assert_eq!(err.code, ErrorCode::OutputDirectoryCreateFailed);
        assert_eq!(err.stage, Some(ProcessingStage::Rename));
    }

    #[test]
    fn final_path_recomputes_after_late_conflict() {
        let dir = tempfile::tempdir().unwrap();
        let output_dir = dir.path().join("Rustitler 输出");
        fs::create_dir_all(&output_dir).unwrap();
        let temp_path = output_dir.join(".标题.rustitler.tmp");
        fs::write(&temp_path, b"new").unwrap();
        let stale_final_path = available_output_path(&output_dir, "标题", Some(OsStr::new("pdf")));
        fs::write(&stale_final_path, b"late conflict").unwrap();

        let final_path = finalize_temporary_copy(
            Path::new("/tmp/input/old.pdf"),
            &temp_path,
            &output_dir,
            "标题",
            Some(OsStr::new("pdf")),
        )
        .unwrap();

        assert_eq!(final_path.file_name().unwrap(), "标题 (2).pdf");
        assert_eq!(
            fs::read(output_dir.join("标题.pdf")).unwrap(),
            b"late conflict"
        );
        assert_eq!(fs::read(final_path).unwrap(), b"new");
        assert!(!temp_path.exists());
    }
}
