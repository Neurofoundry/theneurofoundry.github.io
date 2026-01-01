# Copilot Instructions for Neurofoundry Codebase

## Big Picture Architecture
- The codebase is organized around modular agents, orchestration scripts, and a personality system.
- Major components include: agent definitions (YAML), orchestration logic (backend/task_orchestrator.py), and core modules for personality and feedback (nf_*.py).
- Data flows from user input through agent orchestration, with feedback and personality modules providing context-aware responses.
- Documentation and configuration files are located in `WebsiteContent/Documents/` and `neuroforge_system_data/config/`.

## Developer Workflows
- Use provided scripts and modules for agent orchestration and personality upgrades.
- Build and test workflows are not standardized; refer to documentation in `FEATURE_MODERNIZATION_PLAN.md` and `FEEDBACK_IMPLEMENTATION_SUMMARY.md` for integration steps.
- For package upgrades, extract and copy modules as described in `Documents/README.md`.
- Common commands:
  - Extract package: `tar -xzf neuroforge_personality_system_*.tar.gz`
  - Copy modules: `cp nf_*.py /path/to/your/neuroforge/`

## Project-Specific Conventions
- Do not explain code changes unless explicitly asked.
- Do not make changes that aren't requested.
- Always verify completion and wait for the next task before proceeding.
- Agent YAML files define roles, endpoints, and behavioral rules; see `AGENTS.md` for examples.
- Use backticks for file paths in documentation for clarity.

## Integration Points & Dependencies
- Agents are defined in `agents/*.yaml` and their roles in `agents/*_role.md`.
- Orchestration logic is in `backend/task_orchestrator.py`.
- Personality system modules are in the root and referenced in documentation.
- External dependencies include Python scripts, YAML configs, and tarball packages for upgrades.

## Cross-Component Communication
- Agents communicate via orchestrator scripts and shared configuration files.
- Feedback and personality modules interact with agents to provide context-aware responses.
- Reports and logs are written to `Tasks/reports/` for system health and integrity checks.

## Key Files & Directories
- `agents/*.yaml` — Agent definitions
- `agents/*_role.md` — Agent role instructions
- `backend/task_orchestrator.py` — Orchestration logic
- `WebsiteContent/Documents/` — Documentation and upgrade guides
- `neuroforge_system_data/config/` — Configuration files
- `nf_*.py` — Core personality system modules
- `Tasks/reports/` — System health and integrity reports

---

For further details, see AGENTS.md and documentation in WebsiteContent/Documents/. Always follow project-specific conventions and verify completion before moving to the next task.