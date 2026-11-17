import { db } from "../src/config/database/index.js";

const LANGUAGES = [
  { code: "en", name: "English" },
  // TODO: add the other 7 supported languages, e.g. { code: "xx", name: "..." }
];

const run = async (): Promise<void> => {
  for (const language of LANGUAGES) {
    await db.language.upsert({
      where: { code: language.code },
      create: { ...language, isActive: true },
      update: { name: language.name },
    });
  }
  console.log(`Seeded ${LANGUAGES.length} language(s)`);
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });