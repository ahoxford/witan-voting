import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo debate room…");

  await prisma.debateRoom.deleteMany({});

  const room = await prisma.debateRoom.create({
    data: {
      title: "AI Will Replace Software Engineers",
      question: "Do you believe AI will replace most software engineers within 10 years?",
      options: {
        create: [
          { label: "Agree", order: 0 },
          { label: "Disagree", order: 1 },
          { label: "Undecided", order: 2 },
        ],
      },
    },
    include: { options: true },
  });

  console.log(`Created room: ${room.id} — "${room.title}"`);
  console.log(`Vote URL: http://localhost:3000/vote/${room.id}`);
  console.log(`Screen URL: http://localhost:3000/screen/${room.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
