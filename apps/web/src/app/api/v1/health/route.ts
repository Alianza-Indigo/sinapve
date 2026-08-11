import { getDatabaseHealth } from "@/server/data/repository";
import { isPrivateBlobConfigured } from "@/server/storage/private-blob";
import { isAiConfigured } from "@/server/ai/gateway";
import { isOidcConfigured } from "@/server/auth/oidc";
import { isGatewaySigningEnabled } from "@/server/auth/gateway-signature";
import { isNativeQueueConfigured } from "@/server/jobs/adapter";
import { isChannelConfigured } from "@/server/notifications/dispatch";
import { isExternalScannerConfigured } from "@/server/storage/attachment-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint de salud publico para verificar el despliegue por HTTP. No expone
// datos ni secretos: solo booleanos de configuracion, conectividad de base y si
// las migraciones estan aplicadas. Migraciones expectativas al dia de hoy: 9.
const EXPECTED_MIGRATIONS = 10;

export async function GET() {
  const database = await getDatabaseHealth().catch(() => ({
    configured: false,
    reachable: false,
    migrationsApplied: false,
    appliedMigrations: 0,
    publicTables: 0
  }));

  const fieldEncryption = Boolean(
    process.env.SINAPVE_FIELD_ENCRYPTION_KEY && process.env.SINAPVE_FIELD_ENCRYPTION_KEY.length >= 32
  );

  const checks = {
    database: {
      ...database,
      migrationsUpToDate: database.appliedMigrations >= EXPECTED_MIGRATIONS,
      expectedMigrations: EXPECTED_MIGRATIONS
    },
    storage: { blobConfigured: isPrivateBlobConfigured(), antivirusConfigured: isExternalScannerConfigured() },
    security: { fieldEncryptionConfigured: fieldEncryption, cronSecretConfigured: Boolean(process.env.CRON_SECRET) },
    identity: { oidcConfigured: isOidcConfigured(), gatewaySigningEnabled: isGatewaySigningEnabled() },
    ai: { gatewayConfigured: isAiConfigured() },
    notifications: {
      inApp: isChannelConfigured("in_app"),
      email: isChannelConfigured("email"),
      sms: isChannelConfigured("sms"),
      push: isChannelConfigured("push"),
      voice: isChannelConfigured("voice")
    },
    queue: { nativeConfigured: isNativeQueueConfigured() }
  };

  // "ok" solo si la base conecta y el esquema esta aplicado; si no, "degraded".
  const ok = checks.database.reachable && checks.database.migrationsApplied;

  return Response.json(
    { status: ok ? "ok" : "degraded", time: new Date().toISOString(), checks },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
    }
  );
}
