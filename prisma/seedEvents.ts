import { db } from "../src/config/database/index.js";

const inDays = (days: number): Date => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return new Date(date.toISOString().slice(0, 10));
};

const run = async (): Promise<void> => {
  await db.event.createMany({
    data: [
      {
        title: "Friday Night Live",
        description: "Live band and open dance floor.",
        location: "Main Hall",
        eventDate: inDays(3),
        startTime: "20:00",
        endTime: "23:30",
      },
      {
        title: "Rooftop DJ Set",
        location: "Rooftop Lounge",
        eventDate: inDays(10),
        startTime: "21:00",
      },
    ],
  });

  await db.vibe.createMany({
    data: [
      { title: "Weekend Events", category: "EVENT", location: "Main Hall" },
      { title: "Acoustic Evenings", category: "LIVE_MUSIC" },
      { title: "After Dark", category: "NIGHTLIFE", location: "Rooftop Lounge" },
    ],
  });

  console.log("Seeded sample events and vibes");
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });