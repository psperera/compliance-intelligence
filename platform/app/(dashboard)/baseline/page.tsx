import { getRegulations } from "../../../lib/data/store";
import { Crumbs, PageHead } from "../../../components/ui";
import { ExportButton, AddRegulationButton } from "../../../components/buttons";
import { BaselineTable } from "../../../components/baseline-table";

export default async function BaselinePage() {
  const regs = await getRegulations();
  const exportRows = regs.map((r) => ({ ...r, sites: r.sites.join(" "), watch: r.watch ? "yes" : "no" }));
  return (
    <>
      <Crumbs items={["Regulatory Baseline"]} />
      <PageHead
        title="Regulatory Baseline"
        subtitle="The regulations, permits and obligations that apply to Waygate — work directly within the regulatory record."
        actions={<>
          <ExportButton rows={exportRows} filename="regulatory-baseline.csv"
            columns={[{ key: "id", header: "ID" }, { key: "title", header: "Title" }, { key: "jur", header: "Jurisdiction" }, { key: "topic", header: "Topic" }, { key: "agency", header: "Agency" }, { key: "status", header: "Status" }, { key: "eff", header: "Effective" }, { key: "owner", header: "Owner" }, { key: "risk", header: "Risk" }, { key: "comp", header: "Compliance" }]} />
          <AddRegulationButton />
        </>}
      />
      <BaselineTable regs={regs} />
    </>
  );
}
