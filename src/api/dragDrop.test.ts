import { describe, expect, it, vi } from "vitest";

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
});
