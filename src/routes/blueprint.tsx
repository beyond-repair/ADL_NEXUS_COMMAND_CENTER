import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { LEVEL_LABEL, MISSION_LABEL, MISSION_PATH, OWNER_GATES, PIPELINE } from "@/lib/nexus/company";

export const Route = createFileRoute("/blueprint")({ component: BlueprintPage });

function BlueprintPage() {
  return (
    <Shell>
      <article className="max-w-2xl py-6">
        <p className="font-mono text-xs text-muted">Operating contract · 2.0</p>
        <h1 className="mt-2 text-3xl font-medium">What this company can do</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          NEXUS is the owner’s command center for Atomic Dream Labs. A mission moves through a fixed workforce.
          Completion is a passing verification record plus your acceptance. An agent saying it is done does not count.
        </p>
        <Section title="The loop">
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {MISSION_PATH.map((step) => (
              <li key={step}>{MISSION_LABEL[step]}</li>
            ))}
          </ol>
        </Section>
        <Section title="Workforce on this release">
          <p className="font-mono text-xs leading-relaxed text-muted">{PIPELINE.join(" → ")}</p>
          <p className="mt-2 text-sm text-muted">
            Research, product, architecture, design, and implementation are written when you run that department.
            Quality is computed from the artifacts. Operations assembles the packet and does not change the result.
          </p>
        </Section>
        <Section title="Permission">
          <ul className="space-y-1 text-sm">
            {LEVEL_LABEL.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
            {OWNER_GATES.map((gate) => (
              <li key={gate}>{gate}</li>
            ))}
          </ul>
        </Section>
        <Section title="Honest limits">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
            <li>One workspace per signed-in owner. No second company, no customers, no money movement.</li>
            <li>After you authorize, Run the company walks the remaining departments and updates the record after each one. It stops if quality fails. It does not keep going after you leave the page.</li>
            <li>Accepted missions become verified memory. The next plan and every department read that memory. Unaccepted drafts do not.</li>
            <li>Department writing uses GPT-OSS 20B through a free public endpoint. It does not spend model credits. If that endpoint is down, the local orchestrator writes the step and says so.</li>
            <li>The company record stays when you come back. A published deploy uses the hosted database when one is configured.</li>
            <li>A failed check is an open defect. Fix and retest redoes the department that failed it, then verifies again. A later pass closes the defect.</li>
          </ul>
        </Section>
      </article>
    </Shell>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
