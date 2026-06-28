import { getCurrentWebview } from "@tauri-apps/api/webview";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { TauriDragDropEvent } from "../types/ipc";
import type { StopListening } from "./events";

export const subscribeFileDrops = async (
  onDrop: (paths: string[]) => void,
  onActiveChange?: (active: boolean) => void,
): Promise<StopListening> => {
  const handleDropEvent = (event: { payload: unknown }) => {
    const payload = event.payload as TauriDragDropEvent;

    if (payload.type === "enter") {
      onActiveChange?.(true);
      return;
    }

    if (payload.type === "leave") {
      onActiveChange?.(false);
      return;
    }

    if (payload.type === "drop") {
      onActiveChange?.(false);
      onDrop(payload.paths);
    }
  };

  const listeners = await Promise.allSettled([
    getCurrentWebview().onDragDropEvent(handleDropEvent),
    getCurrentWindow().onDragDropEvent(handleDropEvent),
  ]);

  const unlisteners = listeners.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );

  if (unlisteners.length === 0) {
    const reason = listeners.find((result) => result.status === "rejected")?.reason;
    throw reason instanceof Error ? reason : new Error(String(reason));
  }

  return () => {
    unlisteners.forEach((unlisten) => unlisten());
  };
};
