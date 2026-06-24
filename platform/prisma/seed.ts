/**
 * prisma/seed.ts — seed the focused app schema (Sites, Regulations, ChangeEvents, Actions,
 * Users, headed by Tony Hammond) from the same data the in-memory backend uses.
 *
 *   pnpm prisma db seed     (or: npm run prisma:seed)
 *
 * Idempotent (upserts on id/email).
 */
import { PrismaClient } from "@prisma/client";
import { SITES, SEED_REGS, SEED_CHANGES, SEED_ACTIONS } from "../lib/data/store";
import { SEED_USERS } from "../lib/data/users";

const db = new PrismaClient();

async function main() {
  for (const s of SITES) {
    const { id, ...rest } = s;
    await db.site.upsert({ where: { ref: id }, update: rest, create: { ref: id, ...rest } });
  }
  for (const r of SEED_REGS) {
    await db.regulation.upsert({ where: { id: r.id }, update: r, create: r });
  }
  for (const c of SEED_CHANGES) {
    await db.changeEvent.upsert({ where: { id: c.id }, update: c, create: c });
  }
  for (const a of SEED_ACTIONS) {
    await db.actionItem.upsert({ where: { id: a.id }, update: a, create: a });
  }
  for (const u of SEED_USERS) {
    await db.appUser.upsert({ where: { id: u.id }, update: u, create: u });
  }
  console.log(`Seeded ${SITES.length} sites, ${SEED_REGS.length} regulations, ${SEED_CHANGES.length} changes, ${SEED_ACTIONS.length} actions, ${SEED_USERS.length} users (HS&E Director: Tony Hammond).`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
