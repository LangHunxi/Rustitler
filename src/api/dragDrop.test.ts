import { beforeEach, describe, expect, it, vi } from "vitest";

const onWebviewDragDropEventMock = vi.fn();
const onWindowDragDropEventMock = vi.fn();

vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => ({
    onDragDropEvent: onWebviewDragDropEventMock,
  }),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    onDragDropEvent: onWindowDragDropEventMock,
  }),
}));

describe("file drop subscription", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("subscribes to current webview and window drag-drop events and forwards dropped paths", async () => {
    const unlistenWebview = vi.fn();
    const unlistenWindow = vi.fn();
    onWebviewDragDropEventMock.mockResolvedValueOnce(unlistenWebview);
    onWindowDragDropEventMock.mockResolvedValueOnce(unlistenWindow);
    const onDrop = vi.fn();
    const onActiveChange = vi.fn();
    const { subscribeFileDrops } = await import("./dragDrop");

    const unlisten = await subscribeFileDrops(onDrop, onActiveChange);
    const handler = onWindowDragDropEventMock.mock.calls[0][0];

    handler({ payload: { type: "enter", paths: ["/input/a.pdf"], position: { x: 1, y: 2 } } });
    handler({ payload: { type: "drop", paths: ["/input/a.pdf"], position: { x: 1, y: 2 } } });

    expect(onActiveChange).toHaveBeenNthCalledWith(1, true);
    expect(onActiveChange).toHaveBeenNthCalledWith(2, false);
    expect(onDrop).toHaveBeenCalledWith(["/input/a.pdf"]);

    unlisten();
    expect(unlistenWebview).toHaveBeenCalled();
    expect(unlistenWindow).toHaveBeenCalled();
  });

  it("forwards the same drop gesture only once when both Tauri targets emit it", async () => {
    onWebviewDragDropEventMock.mockResolvedValueOnce(vi.fn());
    onWindowDragDropEventMock.mockResolvedValueOnce(vi.fn());
    const onDrop = vi.fn();
    const { subscribeFileDrops } = await import("./dragDrop");

    await subscribeFileDrops(onDrop);
    const webviewHandler = onWebviewDragDropEventMock.mock.calls[0][0];
    const windowHandler = onWindowDragDropEventMock.mock.calls[0][0];
    const dropPayload = {
      payload: { type: "drop", paths: ["/input/a.pdf"], position: { x: 1, y: 2 } },
    };

    webviewHandler(dropPayload);
    windowHandler(dropPayload);

    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledWith(["/input/a.pdf"]);
  });
});
