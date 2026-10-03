import { contextBridge, ipcRenderer } from "electron";
import type { Bridge, RunEvent } from "../shared/contracts";
const api: Bridge = {
  openReference: (id) => ipcRenderer.invoke("reference:open", id),
  load: () => ipcRenderer.invoke("state:load"),
  save: (state) => ipcRenderer.invoke("state:save", state),
  run: (request) => ipcRenderer.invoke("run", request),
  stop: () => ipcRenderer.invoke("stop"),
  format: (...args) => ipcRenderer.invoke("format", ...args),
  importSnippets: () => ipcRenderer.invoke("snippets:import"),
  exportSnippets: (snippets) => ipcRenderer.invoke("snippets:export", snippets),
  importFile: () => ipcRenderer.invoke("file:import"),
  exportFile: (tab) => ipcRenderer.invoke("file:export", tab),
  packages: (...args) => ipcRenderer.invoke("packages", ...args),
  types: () => ipcRenderer.invoke("types"),
  preview: (bounds) => ipcRenderer.invoke("preview:bounds", bounds),
  onEvent: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, value: RunEvent) =>
      listener(value);
    ipcRenderer.on("run:event", handler);
    return () => ipcRenderer.removeListener("run:event", handler);
  },
  onPackageLog: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, text: string) =>
      listener(text);
    ipcRenderer.on("packages:log", handler);
    return () => ipcRenderer.removeListener("packages:log", handler);
  },
};
contextBridge.exposeInMainWorld("openscratch", api);
