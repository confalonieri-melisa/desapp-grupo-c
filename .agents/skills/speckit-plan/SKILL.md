---
name: speckit-plan
description: "Execute the implementation planning workflow using the plan template to generate design artifacts. Use for the Spec Kit plan step."
---

# speckit-plan

Read [the workflow](references/workflow.md) and execute it for this request from the repository root.

Treat `$ARGUMENTS` in the workflow as the user input accompanying this skill invocation, not a shell variable or a template that needs substitution on disk.

Use the existing `.specify/` scripts, templates and project constitution, and preserve the feature history in `specs/`. References to other `$speckit-*` skills identify separate workflow steps; do not run later steps unless requested. External actions such as creating GitHub issues require the authorization specified by the workflow and the user request.
