import { describe, expect, it, vi } from "vitest";

const onDragDropEventMock = vi.fn();

vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => ({
    onDragDropEvent: onDragDropEventMock,
  }),
}));

describe("file drop subscription", () => {
  it("subscribes to current webview drag-drop events and forwards dropped paths", async () => {
    const unlisten = vi.fn();
    onDragDropEventMock.mockResolvedValueOnce(unlisten);
    const onDrop = vi.fn();
    const onActiveChange = vi.fn();
    const { subscribeFileDrops } = await import("./dragDrop");

    await expect(subscribeFileDrops(onDrop, onActiveChange)).resolves.toBe(unlisten);
    const handler = onDragDropEventMock.mock.calls[0][0];

    handler({ payload: { type: "enter", paths: ["/input/a.pdf"], position: { x: 1, y: 2 } } });
    handler({ payload: { type: "drop", paths: ["/input/a.pdf"], position: { x: 1, y: 2 } } });

    expect(onActiveChange).toHaveBeenNthCalledWith(1, true);
    expect(onActiveChange).toHaveBeenNthCalledWith(2, false);
    expect(onDrop).toHaveBeenCalledWith(["/input/a.pdf"]);
  });
});
