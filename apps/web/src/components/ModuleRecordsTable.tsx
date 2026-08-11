import type { PlatformRecord } from "@/server/domain/types";

export function ModuleRecordsTable({ records }: { records: PlatformRecord[] }) {
  return (
    <div className="table-wrap">
      <table>
        <caption className="muted">Registros operativos cargados desde la base de datos.</caption>
        <thead>
          <tr>
            <th>ID</th>
            <th>Titulo</th>
            <th>Estado</th>
            <th>Responsable / alcance</th>
            <th>Ultima actualizacion</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan={6}>Sin registros en la base de datos.</td>
            </tr>
          ) : (
            records.map((record) => (
              <tr key={`${record.id}-${record.title}`}>
                <td>{record.id}</td>
                <td>{record.title}</td>
                <td>{record.status}</td>
                <td>{record.owner}</td>
                <td>{record.updatedAt}</td>
                <td>{record.detail}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
