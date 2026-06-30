import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fileView, scoringResult } from "./test/fixtures";

const mocks = vi.hoisted(() => ({
  startBatch: vi.fn(),
  cancelBatch: vi.fn(),
  getBatchState: vi.fn(),
  confirmPendingOutput: vi.fn(),
  selectCandidateTitle: vi.fn(),
  undoBatch: vi.fn(),
  listHistory: vi.fn(),
  getHistoryBatch: vi.fn(),
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
  importSettings: vi.fn(),
  exportSettings: vi.fn(),
  resetSettings: vi.fn(),
  subscribeBatchEvents: vi.fn(),
  subscribeFileDrops: vi.fn(),
  selectFiles: vi.fn(),
  selectFolder: vi.fn(),
  dropHandler: undefined as undefined | ((paths: string[]) => void),
  activeHandler: undefined as undefined | ((active: boolean) => void),
}));

const settingsFixture = {
  version: 1,
  autoOutputThreshold: 70,
  layoutSensitivity: 1,
  positionSensitivity: 1,
  keywordSensitivity: 1,
  textQualitySensitivity: 1,
  ocrConservatism: 1,
  keywordRules: [{ keyword: "通知", scoreDelta: 5 }],
  regexRules: [],
  debugMode: false,
};

vi.mock("./api/commands", () => ({
  startBatch: mocks.startBatch,
  cancelBatch: mocks.cancelBatch,
  getBatchState: mocks.getBatchState,
  confirmPendingOutput: mocks.confirmPendingOutput,
  selectCandidateTitle: mocks.selectCandidateTitle,
  undoBatch: mocks.undoBatch,
  listHistory: mocks.listHistory,
  getHistoryBatch: mocks.getHistoryBatch,
  loadSettings: mocks.loadSettings,
  saveSettings: mocks.saveSettings,
  importSettings: mocks.importSettings,
  exportSettings: mocks.exportSettings,
  resetSettings: mocks.resetSettings,
}));

vi.mock("./api/events", () => ({
  subscribeBatchEvents: mocks.subscribeBatchEvents,
}));

vi.mock("./api/dragDrop", () => ({
  subscribeFileDrops: mocks.subscribeFileDrops,
}));

vi.mock("./api/fileDialog", () => ({
  selectFiles: mocks.selectFiles,
  selectFolder: mocks.selectFolder,
}));

const renderApp = async () => {
  const { default: App } = await import("./App");
  return render(<App />);
};

describe("App", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.dropHandler = undefined;
    mocks.activeHandler = undefined;
    mocks.startBatch.mockResolvedValue("batch-1");
    mocks.cancelBatch.mockResolvedValue(undefined);
    mocks.getBatchState.mockResolvedValue(null);
    mocks.confirmPendingOutput.mockResolvedValue({});
    mocks.selectCandidateTitle.mockResolvedValue({});
    mocks.undoBatch.mockResolvedValue({ deleted: 1, skippedMissing: 0, skippedModified: 0 });
    mocks.listHistory.mockResolvedValue({
      total: 1,
      batches: [
        {
          batchId: "batch-1",
          createdAt: "2026-06-27T01:00:00Z",
          status: "completed",
          settingsSnapshotId: "settings-1",
          summary: {
            total: 1,
            outputCreated: 1,
            pending: 0,
            skipped: 0,
            failed: 0,
            cancelled: 0,
          },
        },
      ],
    });
    mocks.getHistoryBatch.mockResolvedValue({
      batchId: "batch-1",
      createdAt: "2026-06-27T01:00:00Z",
      status: "completed",
      settingsSnapshotId: "settings-1",
      summary: {
        total: 1,
        outputCreated: 1,
        pending: 0,
        skipped: 0,
        failed: 0,
        cancelled: 0,
      },
      files: [
        {
          file: {
            fileJobId: "file-1",
            batchId: "batch-1",
            sourcePath: "/input/source.pdf",
            fileName: "source.pdf",
            fileType: "pdf",
            status: "outputCreated",
            recognizedTitle: "项目通知",
            confidence: 84,
            outputPath: "/input/Rustitler 输出/项目通知.pdf",
          },
          sourceFingerprint: {
            normalizedPath: "/input/source.pdf",
            sizeBytes: 2048,
            modifiedTime: "2026-06-27T00:00:00Z",
          },
        },
      ],
    });
    mocks.loadSettings.mockResolvedValue(settingsFixture);
    mocks.saveSettings.mockImplementation(async (settings) => settings);
    mocks.importSettings.mockResolvedValue(settingsFixture);
    mocks.exportSettings.mockResolvedValue(undefined);
    mocks.resetSettings.mockResolvedValue(settingsFixture);
    mocks.subscribeBatchEvents.mockResolvedValue(() => undefined);
    mocks.subscribeFileDrops.mockImplementation(async (onDrop, onActiveChange) => {
      mocks.dropHandler = onDrop;
      mocks.activeHandler = onActiveChange;
      return () => undefined;
    });
    mocks.selectFiles.mockResolvedValue([]);
    mocks.selectFolder.mockResolvedValue([]);
  });

  it("renders the main queue, history, and settings workflows", async () => {
    await renderApp();

    expect(screen.getByRole("heading", { name: "Rustitler" })).toBeInTheDocument();
    expect(screen.getByText("拖入文件或文件夹开始处理")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "历史" }));
    await waitFor(() => expect(screen.getByText("batch-1")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "查看详情" }));
    await waitFor(() => expect(screen.getByText("项目通知")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "设置" }));
    await waitFor(() => expect(screen.getByLabelText("自动输出阈值")).toHaveValue(70));
    fireEvent.change(screen.getByLabelText("自动输出阈值"), { target: { value: "80" } });
    fireEvent.click(screen.getByRole("button", { name: "保存设置" }));
    await waitFor(() => expect(screen.getByText("设置已保存")).toBeInTheDocument());
  });

  it("starts a batch from dropped file paths", async () => {
    await renderApp();

    await waitFor(() => expect(mocks.dropHandler).toBeDefined());
    await waitFor(() => expect(screen.getByText("支持 PDF、Word、图片；文件夹仅扫描第一层。")).toBeInTheDocument());
    act(() => {
      mocks.dropHandler?.(["/input/a.pdf", "/input/folder"]);
    });

    await waitFor(() =>
      expect(mocks.startBatch).toHaveBeenCalledWith(["/input/a.pdf", "/input/folder"], settingsFixture),
    );
  });

  it("shows an error instead of ignoring drops while settings are loading", async () => {
    mocks.loadSettings.mockImplementation(() => new Promise(() => undefined));
    await renderApp();

    await waitFor(() => expect(mocks.dropHandler).toBeDefined());
    act(() => {
      mocks.dropHandler?.(["/input/a.pdf"]);
    });

    expect(await screen.findByText("设置仍在加载，请稍后再导入。")).toBeInTheDocument();
    expect(mocks.startBatch).not.toHaveBeenCalled();
  });

  it("shows settings load errors on the queue view", async () => {
    mocks.loadSettings.mockRejectedValue(new Error("settings.json 无法读取"));
    await renderApp();

    expect(await screen.findByText("settings.json 无法读取")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导入文件" })).toBeDisabled();
  });

  it("offers explicit file and folder import actions", async () => {
    await renderApp();

    expect(screen.getByRole("button", { name: "导入文件" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导入文件夹" })).toBeInTheDocument();
  });

  it("starts a batch from selected files", async () => {
    mocks.selectFiles.mockResolvedValue(["/input/a.pdf", "/input/b.docx"]);
    await renderApp();

    await waitFor(() => expect(screen.getByText("支持 PDF、Word、图片；文件夹仅扫描第一层。")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "导入文件" }));

    await waitFor(() =>
      expect(mocks.startBatch).toHaveBeenCalledWith(["/input/a.pdf", "/input/b.docx"], settingsFixture),
    );
  });

  it("shows a useful error when the file picker fails", async () => {
    mocks.selectFiles.mockRejectedValue(new Error("dialog not available"));
    await renderApp();

    await waitFor(() => expect(screen.getByText("支持 PDF、Word、图片；文件夹仅扫描第一层。")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "导入文件" }));

    expect(await screen.findByText("dialog not available")).toBeInTheDocument();
    expect(mocks.startBatch).not.toHaveBeenCalled();
  });

  it("shows a useful error when starting an import fails", async () => {
    mocks.selectFiles.mockResolvedValue(["/input/a.pdf"]);
    mocks.startBatch.mockRejectedValue({
      userMessage: "无法读取所选文件，请检查权限。",
    });
    await renderApp();

    await waitFor(() => expect(screen.getByText("支持 PDF、Word、图片；文件夹仅扫描第一层。")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "导入文件" }));

    expect(await screen.findByText("无法读取所选文件，请检查权限。")).toBeInTheDocument();
  });

  it("starts a batch from a selected folder", async () => {
    mocks.selectFolder.mockResolvedValue(["/input/folder"]);
    await renderApp();

    await waitFor(() => expect(screen.getByText("支持 PDF、Word、图片；文件夹仅扫描第一层。")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "导入文件夹" }));

    await waitFor(() =>
      expect(mocks.startBatch).toHaveBeenCalledWith(["/input/folder"], settingsFixture),
    );
  });

  it("shows duplicate warnings without blocking output", async () => {
    let emitBatchEvent: ((event: unknown) => void) | undefined;
    mocks.subscribeBatchEvents.mockImplementation(async (handler) => {
      emitBatchEvent = handler;
      return () => undefined;
    });
    await renderApp();

    await waitFor(() => expect(emitBatchEvent).toBeDefined());
    act(() => {
      emitBatchEvent?.({ type: "BatchStarted", batchId: "batch-1", createdAt: "now", totalFiles: 1 });
      emitBatchEvent?.({
        type: "FileQueued",
        batchId: "batch-1",
        file: fileView({
          fileJobId: "file-duplicate",
          fileName: "2.pdf",
          sourcePath: "/Users/example/Desktop/2.pdf",
          status: "queued",
          duplicateWarning:
            "疑似重复：历史批次 batch-old 的文件 file-old 已输出到 /Users/example/Desktop/Rustitler 输出/旧标题.pdf。",
        }),
      });
      emitBatchEvent?.({
        type: "FileProgress",
        batchId: "batch-1",
        fileJobId: "file-duplicate",
        stage: "extract",
        progress: 0,
      });
      emitBatchEvent?.({
        type: "FileOutputCreated",
        batchId: "batch-1",
        fileJobId: "file-duplicate",
        outputPath: "/Users/example/Desktop/Rustitler 输出/新标题.pdf",
      });
    });

    expect(screen.getAllByText("/Users/example/Desktop/Rustitler 输出/新标题.pdf").length).toBeGreaterThan(0);
    expect(screen.queryByText("失败原因")).not.toBeInTheDocument();
    expect(screen.queryByText("重复提示")).not.toBeInTheDocument();
    expect(screen.queryByText("处理日志")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("文件名主体")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "确认输出" })).not.toBeInTheDocument();
  });

  it("shows only the top five title candidates in file details", async () => {
    let emitBatchEvent: ((event: unknown) => void) | undefined;
    mocks.subscribeBatchEvents.mockImplementation(async (handler) => {
      emitBatchEvent = handler;
      return () => undefined;
    });
    await renderApp();

    await waitFor(() => expect(emitBatchEvent).toBeDefined());
    const candidates = Array.from({ length: 6 }, (_, index) => ({
      text: `候选标题 ${index + 1}`,
      source: "pdfLayout" as const,
      pageIndex: 0,
      score: 90 - index,
      categoryScores: {
        layout: 30,
        position: 20,
        keyword: 15,
        textQuality: 20,
        penalty: 0,
      },
      ruleDetails: [],
    }));
    act(() => {
      emitBatchEvent?.({ type: "BatchStarted", batchId: "batch-1", createdAt: "now", totalFiles: 1 });
      emitBatchEvent?.({
        type: "FileQueued",
        batchId: "batch-1",
        file: fileView({
          fileJobId: "file-candidates",
          fileName: "many.pdf",
          sourcePath: "/input/many.pdf",
          status: "queued",
        }),
      });
      emitBatchEvent?.({
        type: "FileScored",
        batchId: "batch-1",
        fileJobId: "file-candidates",
        result: scoringResult({
          finalTitle: "候选标题 1",
          confidence: 90,
          candidates,
        }),
      });
    });

    const candidatesSection = screen.getByRole("heading", { name: "候选标题" }).closest("section");

    expect(candidatesSection).not.toBeNull();
    expect(within(candidatesSection!).getByText("候选标题 1")).toBeInTheDocument();
    expect(within(candidatesSection!).getByText("候选标题 5")).toBeInTheDocument();
    expect(within(candidatesSection!).queryByText("候选标题 6")).not.toBeInTheDocument();
  });

  it("keeps candidate details collapsed and trims file facts by default", async () => {
    let emitBatchEvent: ((event: unknown) => void) | undefined;
    mocks.subscribeBatchEvents.mockImplementation(async (handler) => {
      emitBatchEvent = handler;
      return () => undefined;
    });
    await renderApp();

    await waitFor(() => expect(emitBatchEvent).toBeDefined());
    act(() => {
      emitBatchEvent?.({ type: "BatchStarted", batchId: "batch-1", createdAt: "now", totalFiles: 1 });
      emitBatchEvent?.({
        type: "FileQueued",
        batchId: "batch-1",
        file: fileView({
          fileJobId: "file-details",
          fileName: "details.pdf",
          sourcePath: "/input/details.pdf",
          status: "queued",
          duplicateWarning: "疑似重复：旧文件。",
        }),
      });
      emitBatchEvent?.({
        type: "FileScored",
        batchId: "batch-1",
        fileJobId: "file-details",
        result: scoringResult({
          finalTitle: "精简详情标题",
          confidence: 88,
        }),
      });
      emitBatchEvent?.({
        type: "FileOutputCreated",
        batchId: "batch-1",
        fileJobId: "file-details",
        outputPath: "/input/Rustitler 输出/精简详情标题.pdf",
      });
    });

    const detailPanel = screen.getByRole("heading", { name: "详情" }).closest("aside");
    const candidatesSection = screen.getByRole("heading", { name: "候选标题" }).closest("section");

    expect(detailPanel).not.toBeNull();
    expect(within(detailPanel!).getByText("/input/details.pdf")).toBeInTheDocument();
    expect(within(detailPanel!).getByText("最终标题")).toBeInTheDocument();
    expect(within(detailPanel!).getByText("精简详情标题")).toBeInTheDocument();
    expect(within(detailPanel!).getByText("置信度")).toBeInTheDocument();
    expect(within(detailPanel!).getByText("88%")).toBeInTheDocument();
    expect(within(detailPanel!).queryByText("输出路径")).not.toBeInTheDocument();
    expect(within(detailPanel!).queryByText("失败原因")).not.toBeInTheDocument();
    expect(within(detailPanel!).queryByText("重复提示")).not.toBeInTheDocument();
    expect(within(detailPanel!).queryByText("处理日志")).not.toBeInTheDocument();

    expect(candidatesSection).not.toBeNull();
    expect(Array.from(candidatesSection!.querySelectorAll("details")).every((detail) => !detail.open)).toBe(true);
  });

  it("selects a visible candidate title for output", async () => {
    let emitBatchEvent: ((event: unknown) => void) | undefined;
    mocks.subscribeBatchEvents.mockImplementation(async (handler) => {
      emitBatchEvent = handler;
      return () => undefined;
    });
    mocks.selectCandidateTitle.mockResolvedValue(
      fileView({
        fileJobId: "file-select",
        fileName: "select.pdf",
        sourcePath: "/input/select.pdf",
        status: "outputCreated",
        recognizedTitle: "第二候选标题",
        confidence: 76,
        outputPath: "/input/Rustitler 输出/第二候选标题.pdf",
      }),
    );
    await renderApp();

    await waitFor(() => expect(emitBatchEvent).toBeDefined());
    act(() => {
      emitBatchEvent?.({ type: "BatchStarted", batchId: "batch-1", createdAt: "now", totalFiles: 1 });
      emitBatchEvent?.({
        type: "FileQueued",
        batchId: "batch-1",
        file: fileView({
          fileJobId: "file-select",
          fileName: "select.pdf",
          sourcePath: "/input/select.pdf",
          status: "queued",
        }),
      });
      emitBatchEvent?.({
        type: "FileScored",
        batchId: "batch-1",
        fileJobId: "file-select",
        result: scoringResult({
          finalTitle: "第一候选标题",
          confidence: 90,
          candidates: [
            {
              text: "第一候选标题",
              source: "pdfLayout",
              pageIndex: 0,
              score: 90,
              categoryScores: {
                layout: 30,
                position: 20,
                keyword: 20,
                textQuality: 20,
                penalty: 0,
              },
              ruleDetails: [],
            },
            {
              text: "第二候选标题",
              source: "pdfLayout",
              pageIndex: 0,
              score: 76,
              categoryScores: {
                layout: 25,
                position: 18,
                keyword: 15,
                textQuality: 18,
                penalty: 0,
              },
              ruleDetails: [],
            },
          ],
        }),
      });
    });

    const candidatesSection = screen.getByRole("heading", { name: "候选标题" }).closest("section");
    const detailPanel = screen.getByRole("heading", { name: "详情" }).closest("aside");
    expect(candidatesSection).not.toBeNull();
    expect(detailPanel).not.toBeNull();
    const useButtons = within(candidatesSection!).getAllByRole("button", { name: "使用" });
    fireEvent.click(useButtons[1]);

    await waitFor(() => expect(mocks.selectCandidateTitle).toHaveBeenCalledWith("file-select", "第二候选标题"));
    expect(within(detailPanel!).getByText("最终标题").nextElementSibling).toHaveTextContent("第二候选标题");
    expect(within(detailPanel!).getByText("置信度").nextElementSibling).toHaveTextContent("76%");
  });
});
