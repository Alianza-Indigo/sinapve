import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

// Aplica las migraciones versionadas (apps/web/drizzle) contra la base enlazada.
// Usa el mismo driver Neon HTTP que la aplicacion. Idempotente: drizzle registra
// las migraciones aplicadas y solo ejecuta las nuevas.
//
// Uso:  DATABASE_URL="postgres://..." corepack pnpm --filter @sinapve/web db:migrate
async function main() {
  // Modo opcional (para el build de Vercel): si no hay base enlazada, se omite
  // sin romper el despliegue. En ejecucion manual/CI (sin --optional) es estricto.
  const optional = process.argv.includes("--optional") || process.env.MIGRATE_OPTIONAL === "1";
  const url = process.env.DATABASE_URL;
  if (!url) {
    if (optional) {
      console.log("db:migrate omitido: no hay DATABASE_URL enlazada (build sin base).");
      return;
    }
    console.error("DATABASE_URL es requerida para aplicar migraciones. Enlace la base (Neon) antes de migrar.");
    process.exit(1);
  }

  const sql = neon(url);
  const db = drizzle(sql);

  console.log("Aplicando migraciones desde ./drizzle ...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migraciones aplicadas correctamente.");
}

main().catch((error) => {
  console.error("Fallo la aplicacion de migraciones:", error);
  process.exit(1);
});
