import type { Value } from "../shared/contracts";
export function Inspector({ value }: { value: Value }) {
  if (!value || typeof value.preview !== "string")
    return <span>Invalid value</span>;
  return value.entries ? (
    <details className="value">
      <summary>
        <span className={`v-${value.type}`}>{value.preview}</span>{" "}
        <span className="muted">
          #{value.id} · {value.entries.length} properties{" "}
          {value.truncated ? " · truncated" : ""}
        </span>
      </summary>
      <div className="properties">
        {value.entries.map(([name, child], i) => (
          <div className="property" key={i}>
            <span className="property-name">{name}: </span>
            <Inspector value={child} />
          </div>
        ))}
      </div>
    </details>
  ) : (
    <span className={`v-${value.type}`}>
      {value.preview}
      {value.truncated ? " … [truncated]" : ""}
    </span>
  );
}
