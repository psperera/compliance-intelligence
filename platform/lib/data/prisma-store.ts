// prisma-store.ts — Prisma-backed implementation of the data accessors.
// Loaded lazily by store.ts/users.ts only when DATA_BACKEND=prisma.
import { prisma } from "../db";
import type { Regulation, ChangeEvent, ActionItem, Severity } from "./store";
import type { ManagedUser } from "./users";

function ref(prefix: string, ids: string[]): string {
  const nums = ids.map((id) => parseInt(id.replace(/\D/g, ""), 10)).filter((n) => !isNaN(n));
  return `${prefix}-${Math.max(0, ...nums) + 1}`;
}

// ---- regulations ----
export async function getRegulations(): Promise<Regulation[]> {
  return (await prisma.regulation.findMany({ orderBy: { changed: "desc" } })) as unknown as Regulation[];
}
export async function getRegulation(id: string): Promise<Regulation | undefined> {
  return (await prisma.regulation.findUnique({ where: { id } })) as unknown as Regulation ?? undefined;
}
export async function getRegulationsForSite(siteId: string): Promise<Regulation[]> {
  return (await prisma.regulation.findMany({ where: { sites: { has: siteId } } })) as unknown as Regulation[];
}
export async function addRegulation(input: Regulation): Promise<Regulation> {
  return (await prisma.regulation.create({ data: input as object })) as unknown as Regulation;
}
export async function setRegulationWatch(id: string, watch: boolean): Promise<Regulation> {
  return (await prisma.regulation.update({ where: { id }, data: { watch } })) as unknown as Regulation;
}

// ---- changes ----
export async function getChanges(): Promise<ChangeEvent[]> {
  return (await prisma.changeEvent.findMany({ orderBy: { date: "desc" } })) as unknown as ChangeEvent[];
}
export async function getChange(id: string): Promise<ChangeEvent | undefined> {
  return (await prisma.changeEvent.findUnique({ where: { id } })) as unknown as ChangeEvent ?? undefined;
}
export async function setChangeStatus(id: string, status: string): Promise<ChangeEvent> {
  return (await prisma.changeEvent.update({ where: { id }, data: { status } })) as unknown as ChangeEvent;
}
export async function nextChangeRef(): Promise<string> {
  const ids = (await prisma.changeEvent.findMany({ select: { id: true } })).map((x) => x.id);
  return ref("CHG", ids);
}
export async function createChange(c: ChangeEvent & { prevText?: string; currText?: string }): Promise<ChangeEvent> {
  return (await prisma.changeEvent.create({ data: c as object })) as unknown as ChangeEvent;
}
export async function getAdHocVersions(changeId: string): Promise<{ prev: string; curr: string } | undefined> {
  const c = await prisma.changeEvent.findUnique({ where: { id: changeId }, select: { prevText: true, currText: true } });
  return c?.prevText && c?.currText ? { prev: c.prevText, curr: c.currText } : undefined;
}

// ---- actions ----
export async function getActions(): Promise<ActionItem[]> {
  return (await prisma.actionItem.findMany({ orderBy: { id: "desc" } })) as unknown as ActionItem[];
}
export async function getActionsForSite(siteId: string): Promise<ActionItem[]> {
  return (await prisma.actionItem.findMany({ where: { site: siteId } })) as unknown as ActionItem[];
}
export async function getActionsForChange(chgId: string): Promise<ActionItem[]> {
  return (await prisma.actionItem.findMany({ where: { chg: chgId } })) as unknown as ActionItem[];
}
export async function nextActionRef(): Promise<string> {
  const ids = (await prisma.actionItem.findMany({ select: { id: true } })).map((x) => x.id);
  return ref("ACT", ids);
}
export async function createAction(a: ActionItem): Promise<ActionItem> {
  return (await prisma.actionItem.create({ data: a as object })) as unknown as ActionItem;
}

// ---- impact cache ----
export async function getCachedImpact(key: string): Promise<unknown | undefined> {
  const r = await prisma.impactCache.findUnique({ where: { key } });
  return r?.payload ?? undefined;
}
export async function setCachedImpact(key: string, payload: unknown): Promise<void> {
  await prisma.impactCache.upsert({ where: { key }, update: { payload: payload as object }, create: { key, payload: payload as object } });
}

// ---- users ----
function mapUser(u: { id: string; name: string; email: string; title: string; role: string; scopeType: string; scope: string[]; status: string; createdAt: string }): ManagedUser {
  return u as unknown as ManagedUser;
}
export async function listUsers(): Promise<ManagedUser[]> {
  return (await prisma.appUser.findMany({ orderBy: { name: "asc" } })).map(mapUser);
}
export async function addUser(u: ManagedUser): Promise<ManagedUser> {
  return mapUser(await prisma.appUser.create({ data: u as object }));
}
export async function updateUser(id: string, patch: Partial<ManagedUser>): Promise<ManagedUser> {
  return mapUser(await prisma.appUser.update({ where: { id }, data: patch as object }));
}
export async function removeUser(id: string): Promise<ManagedUser> {
  return mapUser(await prisma.appUser.delete({ where: { id } }));
}
export async function emailExists(email: string): Promise<boolean> {
  return !!(await prisma.appUser.findUnique({ where: { email } }));
}
export async function countAdmins(): Promise<number> {
  return prisma.appUser.count({ where: { role: "PLATFORM_ADMIN" } });
}
