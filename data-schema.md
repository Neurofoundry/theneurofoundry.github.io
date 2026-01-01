# Data Schema for CF Worker Program

This document describes the primary data model and JSON schema snippets for collecting and ingesting worker data.

Entities
- WorkerProfile
- Skill
- ToolAccess
- Availability
- SecurityProfile
- WorkHistory
- TaskTemplate
- FeedbackEvent

Example JSON Schema (WorkerProfile)

{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "WorkerProfile",
  "type": "object",
  "properties": {
    "id": {"type": "string"},
    "display_name": {"type": "string"},
    "role": {"type": "string"},
    "timezone": {"type": "string"},
    "hourly_rate": {"type": "number"},
    "communication_channels": {
      "type": "array",
      "items": {"type": "string"}
    },
    "consent_flags": {
      "type": "object",
      "properties": {
        "telemetry": {"type": "boolean"},
        "profile_public": {"type": "boolean"}
      }
    }
  },
  "required": ["id", "display_name", "role"]
}

Example JSON Schema (Skill)

{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Skill",
  "type": "object",
  "properties": {
    "skill_id": {"type": "string"},
    "name": {"type": "string"},
    "level": {"type": "integer", "minimum": 1, "maximum": 5},
    "years_experience": {"type": "number"},
    "notes": {"type": "string"}
  },
  "required": ["skill_id", "name", "level"]
}

ToolAccess snippet

{
  "tool_id": "github",
  "name": "GitHub",
  "type": "web",
  "proficiency": 4,
  "credentials_present": true,
  "provisioning_complexity": "low"
}

Notes:
- Keep the schema minimal for the initial survey; extend later as pilot data arrives.
- Store raw survey responses and the normalized schema output to enable later transformation and analysis.
- Use a relational table for WorkerProfile + Skill (1:n), ToolAccess (1:n), WorkHistory (1:n). For MVP SQLite/Postgres is fine.

Field guidance:
- Use stable `id` (UUID or provider id) so imports/updates are idempotent.
- Keep a `consent_flags` object for telemetry and sharing consent.
- Capture `provisioning_complexity` for each tool (low/medium/high) to prioritize onboarding.

Schema files (JSON) can be exported from these snippets for direct ingestion.