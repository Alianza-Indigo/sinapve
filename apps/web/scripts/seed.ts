import { cases, organizations, reports } from "../src/server/data/demo";

async function main() {
  console.log("SINAPVE synthetic seed preview");
  console.log(JSON.stringify({ organizations: organizations.length, reports: reports.length, cases: cases.length }, null, 2));
  console.log("Configure DATABASE_URL and extend this script with Drizzle inserts before seeding shared environments.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
