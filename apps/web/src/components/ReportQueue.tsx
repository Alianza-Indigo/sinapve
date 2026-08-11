import type { HelpReport } from "@/server/domain/types";

export function ReportQueue({ reports }: { reports: HelpReport[] }) {
  return (
    <div className="table-wrap">
      <table>
        <caption className="muted">Cola visible desde datos reales autorizados.</caption>
        <thead>
          <tr>
            <th>Folio</th>
            <th>Modo</th>
            <th>Plantel</th>
            <th>Severidad sugerida</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {reports.length === 0 ? (
            <tr>
              <td colSpan={5}>Sin reportes en Neon.</td>
            </tr>
          ) : (
            reports.map((report) => (
              <tr key={report.id}>
                <td>{report.folio}</td>
                <td>{report.mode}</td>
                <td>{report.schoolName}</td>
                <td>{report.suggestedSeverity}</td>
                <td>{report.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
