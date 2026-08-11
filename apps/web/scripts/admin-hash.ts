import { hashPassword } from "../src/server/auth/password";

// Genera el hash scrypt para SINAPVE_ADMIN_PASSWORD_HASH a partir de una
// contrasena. Uso:  corepack pnpm --filter @sinapve/web admin:hash 'MiClaveFuerte'
const password = process.argv[2];
if (!password || password.length < 10) {
  console.error("Proporcione una contrasena de al menos 10 caracteres: admin:hash '<contrasena>'");
  process.exit(1);
}

console.log(hashPassword(password));
