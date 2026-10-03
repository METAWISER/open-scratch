import type { CSSProperties } from "react";
import mark from "../../assets/mark.svg";

// Original 24px drawings: shared by the desktop UI and documentation website.
const paths = {
  play: "M8 5.5 19 12 8 18.5Z",
  stop: "M7 6h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z",
  clear: "m14 4 7 7-9 9H7l-5-5L14 4Zm-7 6 8 8M12 20h9",
  learn: "M12 6C9 3 5 4 3 5v14c3-2 6-2 9 0 3-2 6-2 9 0V5c-2-1-6-2-9 1Zm0 0v13",
  snippets:
    "M8 3h10a2 2 0 0 1 2 2v12M16 7H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2ZM9 11l-3 3 3 3m4-6 3 3-3 3",
  package: "m12 3 9 5v9l-9 5-9-5V8l9-5Zm-9 5 9 5 9-5m-9 5v9M8 5l9 5",
  settings: "M4 7h16M4 17h16M9 4v6m6 4v6",
  plus: "M12 5v14M5 12h14",
  close: "m6 6 12 12M18 6 6 18",
  copy: "M8 4h10a2 2 0 0 1 2 2v10M6 8h8a2 2 0 0 1 2 2v10H4V10a2 2 0 0 1 2-2Z",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  check: "m5 12 4 4L19 6",
  search: "M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Zm-2 4 6 6",
  sun: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1",
  moon: "M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z",
  external: "M14 3h7v7m0-7L11 13M10 5H4v15h15v-6",
} as const;
export type IconName = keyof typeof paths;
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      className="ui-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <img
      className="brand-mark"
      src={mark}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
