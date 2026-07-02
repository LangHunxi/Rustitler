import { getCurrentWebview } from "@tauri-apps/api/webview";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { TauriDragDropEvent } from "../types/ipc";
import type { StopListening } from "./events";

const DUPLICATE_DROP_WINDOW_MS = 250;

const dropSignature = (paths: string[]) => paths.join("\u0000");

export const subscribeFileDrops = async (
  onDrop: (paths: string[]) => void,
  onActiveChange?: (active: boolean) => void,
): Promise<StopListening> => {
  let lastDrop: { signature: string; at: number } | undefined;

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
      const signature = dropSignature(payload.paths);
      const now = Date.now();
      if (
        lastDrop &&
        lastDrop.signature === signature &&
        now - lastDrop.at < DUPLICATE_DROP_WINDOW_MS
      ) {
        return;
      }
      lastDrop = { signature, at: now };
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
