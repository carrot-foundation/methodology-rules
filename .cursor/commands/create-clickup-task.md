# Create ClickUp Task

Create or refine ClickUp tasks following Carrot workflow standards.

## Usage

```
/create-clickup-task [new|refine]
```

## Workflow: New Task

### 1. Gather Context

Ask mandatory questions:

- What specific problem are we solving?
- Which component/system affected?
- Who benefits and how?
- Expected effort (Fibonacci)?

### 2. Assess Scope

- Challenge effort ≥5 → propose smaller increments
- Question urgency if value weak
- Flag mixed deliverables → suggest split
- Surface architectural risks

### 3. Draft Task

- Propose metadata with justification
- Craft emoji-friendly title
- Fill template per `@clickup-task.mdc`
- Remove non-value sections
- Ensure testable DoD items

### 4. Deliver

- Outstanding questions/challenges
- Metadata summary
- Proposed title and body (fenced markdown)
- Default list: Ask user for the target ClickUp list URL
- Post-creation reminders

## Workflow: Refinement

### 1. Analyze Existing

Check for:

- Missing metadata
- Vague TL;DR or DoD
- Generic value delivery

### 2. Ask Questions

Don't assume—demand specifics

### 3. Rewrite

- Strengthen weak language
- Add missing business rules
- Make DoD testable

### 4. Challenge Scope

Even in refinement—suggest splits if needed

## Challenge Points

- 5-pointer? → Split into smaller tasks
- "Improves X"? → Ask for metrics
- Urgent without blockers? → Question timeline
- DoD >8 items? → Reduce scope
- TL;DR restates title? → Remove

## Related

- `.ai/categories/workflow/clickup-task.md` - Complete standards and templates
- `.cursor/rules/commit-rules.mdc` - Commit scope alignment
