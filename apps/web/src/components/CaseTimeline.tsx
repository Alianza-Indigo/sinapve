import type { CaseFile } from "@/server/domain/types";

export function CaseTimeline({ caseFile }: { caseFile: CaseFile }) {
  return (
    <ol className="timeline">
      {caseFile.timeline.map((event) => (
        <li key={event.id}>
          <strong>{event.title}</strong>
          <p className="muted">{new Date(event.at).toLocaleString("es-MX")} · {event.actor}</p>
          <p>{event.detail}</p>
        </li>
      ))}
    </ol>
  );
}
