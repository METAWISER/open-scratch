import { contextBridge, ipcRenderer } from "electron";
import { validEvent } from "../shared/wire";
let records = 0,
  bytes = 0;
// Output-only, untrusted channel. No filesystem, configuration, credentials or app API.
contextBridge.exposeInMainWorld("__scratchOutput", {
  send: (payload: unknown) => {
    if (
      records++ > 10001 ||
      bytes > 4_000_000 ||
      !validEvent(payload) ||
      payload.kind !== "output"
    )
      return;
    bytes += JSON.stringify(payload).length;
    if (bytes > 4_000_000) {
      ipcRenderer.send("preview:output", {
        kind: "output",
        runId: payload.runId,
        level: "warn",
        values: [
          {
            type: "truncated",
            preview: "Output transport limit reached (4 MB).",
          },
        ],
      });
      return;
    }
    ipcRenderer.send("preview:output", payload);
  },
});
