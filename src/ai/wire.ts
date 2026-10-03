import { z } from "zod";
import type { AIErrorCode } from "./contracts";
export const aiSettingsSchema = z.object({
  endpoint: z
    .string()
    .max(2000)
    .url()
    .refine((value) => {
      const u = new URL(value);
      return (
        !u.username &&
        !u.password &&
        !u.search &&
        !u.hash &&
        (u.protocol === "https:" ||
          (u.protocol === "http:" &&
            ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)))
      );
    }, "Use HTTPS, or HTTP on localhost; no embedded credentials or query parameters."),
  model: z.string().trim().min(1).max(200),
});
export type AISettings = z.infer<typeof aiSettingsSchema>;
export const generationSchema = z.object({
  id: z.string().uuid(),
  prompt: z.string().trim().min(1).max(16000),
  context: z.object({
    language: z.enum(["js", "ts", "jsx", "tsx", "py", "cs"]),
    runtime: z.enum(["node", "browser", "python", "dotnet"]),
    code: z.string().max(100000),
  }),
});
export type AIGeneration = z.infer<typeof generationSchema>;
export interface AIStatus {
  settings: AISettings | null;
  hasKey: boolean;
  secureStorage: boolean;
}
export type AIEvent = { id: string } & (
  | { type: "text"; text: string }
  | { type: "done"; code: string }
  | { type: "error"; code: AIErrorCode; message: string }
);
