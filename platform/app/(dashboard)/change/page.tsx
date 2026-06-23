import Link from "next/link";
import { getChanges } from "../../../lib/data/store";
import { Crumbs, PageHead } from "../../../components/ui";
import { ChangeTable } from "../../../components/change-table";

export default async function ChangeRegister() {
  const changes = await getChanges();
  return (
    <>
      <Crumbs items={["Change Control"]} />
      <PageHead title="Regulatory Change Control"
        subtitle="Version-controlled comparison · every change is traceable, every impact has an owner, every decision is auditable."
        actions={<Link className="btn primary" href="/change/compare">⇄ Compare documents</Link>} />
      <ChangeTable changes={changes} />
    </>
  );
}
