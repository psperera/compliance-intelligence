// GET  /api/admin/ai-provider — current FOM LLM config + options.
// POST /api/admin/ai-provider — switch provider/model (RBAC: manage_users / admin).
import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth/current-user";
import { can } from "../../../../lib/auth/rbac";
import { getLlmConfig, setLlmConfig, PROVIDER_LABELS, DEFAULT_MODELS, type LlmProvider } from "../../../../lib/ai/llm";

export async function GET() {
  return NextResponse.json({ config: getLlmConfig(), labels: PROVIDER_LABELS, defaults: DEFAULT_MODELS });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!can(user, "manage_users"))
    return NextResponse.json({ error: "Forbidden: admin permission required" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const provider = body.provider as LlmProvider | undefined;
  if (provider && !(provider in PROVIDER_LABELS))
    return NextResponse.json({ error: "unknown provider" }, { status: 400 });

  const config = setLlmConfig({ provider, model: body.model });
  return NextResponse.json({ ok: true, config });
}
