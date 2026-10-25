---
name: speckit-specify
description: "Create or update the feature specification from a natural language feature description. Use for the Spec Kit specify step."
---

# speckit-specify

Read [the workflow](references/workflow.md) and execute it for this request from the repository root.

Treat `$ARGUMENTS` in the workflow as the user input accompanying this skill invocation, not a shell variable or a template that needs substitution on disk.

Use the existing `.specify/` scripts, templates and project constitution, and preserve the feature history in `specs/`. References to other `$speckit-*` skills identify separate workflow steps; do not run later steps unless requested. External actions such as creating GitHub issues require the authorization specified by the workflow and the user request.
