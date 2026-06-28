import { open } from "@tauri-apps/plugin-dialog";

const documentFilters = [
  {
    name: "支持的文档",
    extensions: ["pdf", "doc", "docx", "png", "jpg", "jpeg"],
  },
];

const normalizeSelection = (selection: string | string[] | null): string[] => {
  if (!selection) {
    return [];
  }
  return Array.isArray(selection) ? selection : [selection];
};

export const selectFiles = async (): Promise<string[]> => {
  const selection = await open({
    title: "选择要处理的文件",
    multiple: true,
    directory: false,
    filters: documentFilters,
  });
  return normalizeSelection(selection);
};

export const selectFolder = async (): Promise<string[]> => {
  const selection = await open({
    title: "选择要处理的文件夹",
    directory: true,
    multiple: false,
  });
  return normalizeSelection(selection);
};
