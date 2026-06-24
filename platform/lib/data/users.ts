// lib/data/users.ts — the user database (in-memory for this build).
//
// State is held on globalThis so it survives Next.js dev hot-reloads and is shared across
// route handlers (otherwise added/removed users would "disappear" on the next request).
//
// PRODUCTION: back with Prisma (User + Role + scope tables) and send a real invite email
// via the EmailProvider when status === "INVITED".

import type { RoleKey } from "../auth/rbac";

export type UserStatus = "ACTIVE" | "INVITED" | "SUSPENDED";
export type ScopeType = "GLOBAL" | "REGION" | "SITE";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  title: string;
  phone: string;
  role: RoleKey;
  scopeType: ScopeType;
  scope: string[];
  status: UserStatus;
  createdAt: string;
}

export const SEED_USERS: ManagedUser[] = [
  { id: "u-hammond", name: "Tony Hammond", email: "tony.hammond@bakerhughes.com", title: "Group HS&E Director", phone: "", role: "PLATFORM_ADMIN", scopeType: "GLOBAL", scope: [], status: "ACTIVE", createdAt: "2026-01-04" },
  { id: "u-perera", name: "Paul Perera", email: "paul.perera@bakerhughes.com", title: "Strategy and Technology Operations Director", phone: "", role: "COMPLIANCE_DIRECTOR", scopeType: "GLOBAL", scope: [], status: "ACTIVE", createdAt: "2026-01-06" },
];

// persist across hot-reloads / module instances (memory backend)
const g = globalThis as unknown as { __ciUsers?: ManagedUser[] };
if (!g.__ciUsers) g.__ciUsers = SEED_USERS.map((u) => ({ ...u }));
const store = () => g.__ciUsers!;

const USE_DB = process.env.DATA_BACKEND === "prisma";
const pdb = () => import("./prisma-store");

export async function listUsers(): Promise<ManagedUser[]> {
  if (USE_DB) return (await pdb()).listUsers();
  return [...store()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function addUser(input: Omit<ManagedUser, "id" | "createdAt" | "status"> & { status?: UserStatus }): Promise<ManagedUser> {
  const u: ManagedUser = {
    ...input,
    id: "u-" + Math.random().toString(36).slice(2, 9),
    status: input.status ?? "INVITED",
    createdAt: new Date().toISOString().slice(0, 10),
  };
  if (USE_DB) {
    if (await (await pdb()).emailExists(input.email)) throw new Error(`A user with email ${input.email} already exists.`);
    return (await pdb()).addUser(u);
  }
  if (store().some((x) => x.email.toLowerCase() === input.email.toLowerCase())) throw new Error(`A user with email ${input.email} already exists.`);
  store().push(u);
  return u;
}

export async function updateUser(id: string, patch: Partial<Pick<ManagedUser, "role" | "scopeType" | "scope" | "status" | "title" | "email" | "phone" | "name">>): Promise<ManagedUser> {
  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  if (USE_DB) return (await pdb()).updateUser(id, clean);
  const u = store().find((x) => x.id === id);
  if (!u) throw new Error("User not found.");
  Object.assign(u, clean);
  return u;
}

export async function removeUser(id: string, actingUserId: string): Promise<ManagedUser> {
  if (id === actingUserId) throw new Error("You can't remove your own account.");
  if (USE_DB) {
    const all = await (await pdb()).listUsers();
    const target = all.find((x) => x.id === id);
    if (!target) throw new Error("User not found.");
    if (target.role === "PLATFORM_ADMIN" && (await (await pdb()).countAdmins()) <= 1) throw new Error("Can't remove the last Platform Administrator.");
    return (await pdb()).removeUser(id);
  }
  const u = store().find((x) => x.id === id);
  if (!u) throw new Error("User not found.");
  if (u.role === "PLATFORM_ADMIN" && store().filter((x) => x.role === "PLATFORM_ADMIN").length <= 1) throw new Error("Can't remove the last Platform Administrator.");
  g.__ciUsers = store().filter((x) => x.id !== id);
  return u;
}
