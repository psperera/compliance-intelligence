// diff-view.tsx — renders the deterministic diff engine's output as a side-by-side view.
// Pure/server component. Consumes ClauseDiff[] (and token spans) produced by lib/diff/diff.ts.
import React from "react";
import type { ClauseDiff, TokenSpan } from "../lib/diff/types";

function spans(tokens: TokenSpan[] | undefined, side: "prev" | "curr", fallback: string) {
  if (!tokens) return <>{fallback}</>;
  return (
    <>
      {tokens
        .filter((t) => t.op === "equal" || (side === "prev" ? t.op === "delete" : t.op === "insert"))
        .map((t, i) =>
          t.op === "equal" ? <span key={i}>{t.text}</span>
            : side === "prev" ? <span key={i} className="del">{t.text}</span>
            : <span key={i} className="ins">{t.text}</span>,
        )}
    </>
  );
}

function Pane({ diffs, side, label, version }: { diffs: ClauseDiff[]; side: "prev" | "curr"; label: string; version: string }) {
  // which clauses appear on this side
  const visible = diffs.filter((d) =>
    side === "prev"
      ? d.changeType !== "ADDED"
      : d.changeType !== "DELETED",
  );
  return (
    <div className="pane">
      <div className="ph2"><span className="vlabel">{label}</span><span className="vno">{version}</span></div>
      <div className="legaltext">
        {visible.map((d) => {
          const text = side === "prev" ? d.prevText ?? "" : d.currText ?? "";
          let body: React.ReactNode = text;
          if (d.changeType === "AMENDED" || d.changeType === "MOVED") body = spans(d.tokenDiff, side, text);
          else if (d.changeType === "ADDED" && side === "curr") body = <span className="ins">{text}</span>;
          else if (d.changeType === "DELETED" && side === "prev") body = <span className="del">{text}</span>;
          return <div className="cl" key={d.clauseNo + side}><div className="cn">{d.clauseNo}</div>{body}</div>;
        })}
      </div>
    </div>
  );
}

export function DiffView({ diffs, prevVersion, currVersion }: { diffs: ClauseDiff[]; prevVersion: string; currVersion: string }) {
  return (
    <>
      <div className="split">
        <Pane diffs={diffs} side="prev" label="Previous version" version={prevVersion} />
        <Pane diffs={diffs} side="curr" label="Current version" version={currVersion} />
      </div>
      <div className="legend">
        <span><span className="ins">&nbsp;&nbsp;</span> Added</span>
        <span><span className="amd">&nbsp;&nbsp;</span> Amended</span>
        <span><span className="del">&nbsp;&nbsp;</span> Removed</span>
      </div>
    </>
  );
}
