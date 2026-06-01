# Pilot Plan — CF Worker Delegation (4-week MVP)

Objective: Validate that CF workers can absorb delegated tasks with provided tooling and templates while meeting quality and throughput targets.

Scope
- 8–12 workers across 3 roles (Dev, QA, Content)
- 6 TaskTemplates from the playbook
- Tools: Slack, GitHub, Google Drive, basic CI

Timeline
- Week 0 (Prep): Publish survey, collect profiles, run telemetry, provision basic access
- Week 1: Onboard workers, run 2 micro-tasks each
- Week 2: Run mixed micro/macro tasks; begin QA sampling
- Week 3: Scale with 2 additional macro tasks; measure throughput
- Week 4: Analyze results, document playbook updates

KPIs
- Throughput: tasks completed per worker per week
- Quality: acceptance pass rate (target ≥ 90%)
- Onboarding time: average time to complete onboarding (target ≤ 2 hours)
- Tool adoption: % of workers using recommended tools within 1 week
- Worker satisfaction: NPS-like score after pilot

Success Criteria
- ≥70% of assigned tasks completed on time with pass rate ≥ 85%
- Positive feedback from ≥ 60% of participants
- No critical security incidents

Data Collection
- Centralized DB (CSV/SQLite) with survey results, telemetry, task outcomes
- Weekly reports: summary of KPIs, outliers, provisioning blockers

Next steps
1. Recruit pilot workers and get consent for telemetry
2. Run survey + interviews
3. Provision access and run onboarding
4. Execute pilot and collect KPI data

Optional: create a small dashboard (Google Data Studio or Grafana) to visualize KPIs during the pilot.