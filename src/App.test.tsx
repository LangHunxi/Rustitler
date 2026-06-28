import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  startBatch: vi.fn(),
  cancelBatch: vi.fn(),
  getBatchState: vi.fn(),
  confirmPendingOutput: vi.fn(),
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
});
