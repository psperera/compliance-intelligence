import Link from "next/link";
import { Crumbs, PageHead } from "../../../../components/ui";
import { CompareTool } from "../../../../components/compare-tool";

export default function ComparePage() {
  return (
    <>
      <Crumbs items={["Change Control", "Compare documents"]} />
      <PageHead title="Compare documents"
        subtitle="Run the deterministic diff engine on any two document versions — paste or upload, then mark up the changes."
        actions={<Link className="btn" href="/change">← Change register</Link>} />
      <CompareTool />
    </>
  );
}
