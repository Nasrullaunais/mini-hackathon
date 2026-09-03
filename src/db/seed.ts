import { db } from "./index";
import { items } from "./schema";

async function main() {
  await db.delete(items);
  await db.insert(items).values([
    { title: "Read the GUIDELINES.md", description: "Before writing any code.", done: true },
    { title: "Pick the topic", description: "Agree as a team, write it in the README." },
    { title: "Model the schema", description: "One person owns src/db/schema.ts." },
  ]);
  console.log("Seeded.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
