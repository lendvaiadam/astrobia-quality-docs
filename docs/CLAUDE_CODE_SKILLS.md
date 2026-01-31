# Claude Code Skills for Asterobia

## Overview
This project uses **Claude Code Skills** to enforce architectural rules, protocols, and best practices. These skills are "tools" that the AI agent can use (or be directed to use) to ensure consistency and quality.

## Location
Skills are stored locally in the repository at:
`/.claude/skills/`

Claude Code (and compatible agents) will automatically discover these skills when working in this directory.

## Available Skills

| Skill | Trigger / Use Case |
| :--- | :--- |
| **asterobia-determinism-gate** | Enforces "Algorithm-Over-AI". Use before merges to verify regression suite and determinism hash. |
| **asterobia-input-closure** | Enforces `InputFactory` usages. Use when writing input logic to prevent netcode bypass. |
| **asterobia-ui-webcomponents** | Guide for creating premium, glassmorphic UI components. |
| **asterobia-multiplayer-preflight** | Checklist for multiplayer readiness (IDs, State, Transport). |
| **asterobia-backend-persistence** | Guidelines for saving/loading and schema versioning. |
| **asterobia-bug-discipline** | Protocol for logging bugs in `BUGLIST.md` before fixing them. |
| **asterobia-web-smoke-tests** | Patterns for Playwright/Browser automated testing. |

## How to Invoke

### Implicit
Simply ask Claude to perform a task related to the skill.
> *"Check if this branch is ready to merge."* 
> -> Trigger: **asterobia-determinism-gate**

> *"Create a new HUD panel for unit selection."*
> -> Trigger: **asterobia-ui-webcomponents**

### Explicit
You can explicitly tell Claude to use a skill for better compliance.
> *"@asterobia-bug-discipline Log this issue I just found."*
> *"Use the determinism gate skill to verify these changes."*

## Operational Rules for AI Agents
1.  **Skills are Guidance**: Follow them strictly. They embody the project's "Constitution".
2.  **HU Gate Override**: If a skill says "PASS" but a Human User (HU) verification is required (e.g., visual check), the HU result is final.
3.  **Updates**: If you find a skill outdated, propose an update to the `.claude/skills/.../SKILL.md` file via PR.

## Quick Verification
To verify skills are loaded locally (in Claude Code CLI):
Type `/` and check if the autocomplete list includes `asterobia-*`.
