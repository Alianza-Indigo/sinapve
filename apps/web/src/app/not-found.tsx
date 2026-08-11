import Link from "next/link";

export default function NotFound() {
  return (
    <main className="section">
      <section className="panel">
        <p className="eyebrow">Sin acceso</p>
        <h1>Recurso no disponible</h1>
        <p className="muted">El recurso no existe o tu alcance no permite consultarlo.</p>
        <Link className="button" href="/">Volver al inicio</Link>
      </section>
    </main>
  );
}
