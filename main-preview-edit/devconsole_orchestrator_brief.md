DevConsole Orchestrator Brief

Date: 2025-12-29
Prepared for: Orchestrator
Prepared by: Automated research scaffold

Summary
-------
This brief combines the DevConsole agent definitions and routing rules with the CF Worker delegation research I scaffolded in this repository. It is intended as a handoff to the Orchestrator to (a) align agent responsibilities, (b) authorize a pilot for CF worker delegation, and (c) provide actionable next steps and artifacts.

1) DevConsole Agent Summary (from P:\Neuroforge_DevConsole\AGENTS.md)
- Purpose: single source of truth for agent roles, routing, and guardrails.
- Agent roster and primary responsibilities:
  - Echo: executor and tool runner — operations, triage, summaries, tool-driven tasks.
  - Onyx: technical reasoning — bugs, systems, APIs, performance.
  - Eden: writing and UX/product copy.
  - Luna: coder — code changes, refactors, patches, implementations.
- Routing and compatibility rules:
  - Default routing uses a rubric scored per agent; overrides via metadata.route/agent.
  - Luna Gate: code-change keywords route to Luna when approval required.
  - Tool gate: tasks with tool prefixes/URLs route to Tool.
  - Compatibility gating: tasks must match agent capabilities from `P:/Neuroforge_DevConsole/agents/*.yaml` or fallback map; agents missing capabilities get score 0.
- Guardrails:
  - Tool execution blocked unless `metadata.allow_tools` is true.
  - Moderate/severe risk levels block execution until review.
  - Code changes require explicit approval before execution.
  - Tasks run in a sandbox workspace under `P:/Neuroforge_DevConsole/Tasks/workspace`.
- Task lifecycle and reporting: intake -> assessment -> routing -> workability -> execution -> completion; reports written to `P:/Neuroforge_DevConsole/Tasks/reports/<id>.md` with routing scores and rationale.

2) Repository Deliverables (I scaffolded in this repo)
Files created:
- `data-schema.md` — Data model and JSON schema snippets for WorkerProfile, Skill, ToolAccess.
- `survey.md` — Low-friction survey and interview guide, with consent and privacy notes.
- `telemetry/collector.py` — Consented CLI telemetry collector to detect installed tools and environment.
- `import_scripts/import_survey.py` — CSV → SQLite importer for quick ingestion.
- `playbook.md` — Delegation playbook with role definitions, onboarding checklist, TaskTemplates, QA, and security guidelines.
- `pilot-plan.md` — 4-week pilot plan with KPIs, timeline, and success criteria.
- `README.md` — Quick next steps and example commands.

3) How the DevConsole agents map to the CF worker delegation effort
- Echo (executor/tool runner): appropriate for running telemetry collectors, automating onboarding invites, and executing non-code tasks (e.g., provisioning, reports).
- Onyx (technical reasoning): reviews tool provisioning complexity, designs automation scripts, and defines CI flows for delegated code tasks.
- Eden (writing): refines survey copy, interview scripts, and onboarding documentation.
- Luna (coder): handles code-change TaskTemplates, PR reviews, and the sandboxed execution of code modifications (only after approval per guardrails).

4) Recommended Orchestrator Actions (short-term)
- Confirm agent capability files exist under `P:/Neuroforge_DevConsole/agents/*.yaml`. If missing, create or provide the capability map so the router can enforce compatibility gating.
- Approve the `survey.md` content and privacy/consent language so the form can be published to pilot candidates.
- Approve telemetry consent wording and instruct pilot participants to run `python telemetry/collector.py --out ./data/telemetry_<id>.json` and upload results to `P:/Neuroforge_DevConsole/Tasks/incoming` (or a secure S3 bucket).
- Ensure `P:/Neuroforge_DevConsole/Tasks/incoming` and `P:/Neuroforge_DevConsole/Tasks/workspace` exist and that test tasks can be placed into intake for routing tests.
- Create a small pilot task set (8–12 workers) and route through the orchestrator to validate routing, compatibility gating, and reporting flows.

5) Security & Guardrail Considerations
- Maintain `allow_tools` metadata discipline: disallow tool execution by default; only allow for trusted routes and tasks with explicit approval.
- Require code-change approval metadata (`approved: true`) before Luna executes patches.
- Use the sandbox workspace for all agent-driven file changes and only merge via human review.
- Record provenance for every task report into `P:/Neuroforge_DevConsole/Tasks/reports` with tool logs and routing rationale.

6) Suggested Next Steps for Presentation to Orchestrator
- Present this brief alongside these artifacts: `survey.md`, `data-schema.md`, `playbook.md`, and `pilot-plan.md`.
- Request Orchestrator approvals for survey wording and telemetry consent.
- Request creation or confirmation of agent capability YAMLs under `P:/Neuroforge_DevConsole/agents/`.
- Schedule a 30-minute kickoff for the pilot and assign roles (Program Owner, Tooling Lead, Security SME, Worker Liaison).

Appendix — Quick Commands
Run telemetry (consented):

```bash
python telemetry/collector.py --out ./data/telemetry_worker1.json
```

Import survey CSV into SQLite (local MVP):

```bash
python import_scripts/import_survey.py responses.csv --db data/survey.db
```

Place pilot task into intake (example):

- Copy `pilot_tasks/sample_task_01.json` into `P:/Neuroforge_DevConsole/Tasks/incoming/` and watch the orchestrator route and report to `P:/Neuroforge_DevConsole/Tasks/reports/<id>.md`.

---

If you want, I can now:
- Convert the 6 TaskTemplates in `playbook.md` into YAML files under `task_templates/` for immediate use by the orchestrator.
- Generate a Typeform JSON export for the survey so you can import it directly into Typeform.
- Create a small Node/Express receiver to collect telemetry JSON and write it to `P:/Neuroforge_DevConsole/Tasks/incoming` with proper consent metadata.

Tell me which of these to do next and I will implement it.