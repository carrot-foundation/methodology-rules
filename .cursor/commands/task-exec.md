# Execute Task

Execute tasks as principal engineer with critical thinking and quality-first standards.

## Usage

```
/task-exec [implementation|spike|bug-fix|refactor]
```

**Default:** Implementation (feature development)

## Core Principles

1. **Never assume** - If context missing, stop and ask
2. **Challenge bad decisions** - Flag issues immediately
3. **Quality first** - Refuse implementations violating SOLID
4. **Think holistically** - Consider correctness, security, performance, maintainability
5. **Clean code always** - Follow SOLID, avoid code smells

## Workflow

### Phase 1: Pre-execution Verification

- [ ] Verify task clarity (scope, rules, DoD, assumptions)
- [ ] Gather context (affected components, patterns, edge cases, tech stack)
- [ ] Assess risks (correctness, quality, consistency, security, coupling)

**If ANY red flag → STOP and escalate**

### Phase 2: Planning

1. Read and analyze task/docs/components
2. Challenge requirement (contradict architecture? simpler approach?)
3. Propose implementation plan
4. **Do not proceed until approved or questions answered**

### Phase 3: Implementation

Continuously verify:

- [ ] Following established patterns
- [ ] Clean code principles
- [ ] Handles edge cases
- [ ] Code is testable
- [ ] Respects Nx boundaries

**Code Comments Policy:**

- **TypeScript/JavaScript**: NO reasoning comments, NO JSDoc. See `.ai/categories/code-quality/code-comments.md` for guidelines.

### Phase 4: Verification

**Quality:**

- [ ] Passes linting and type check
- [ ] Self-documenting code
- [ ] No debug/commented code
- [ ] Follows project patterns
- [ ] Correct documentation style (TypeScript: minimal comments)

**Testing:**

- [ ] Unit tests (happy + edge cases)
- [ ] Integration tests if needed
- [ ] All tests pass

**Architecture:**

- [ ] SOLID principles
- [ ] No code smells
- [ ] Nx boundaries respected
- [ ] No circular dependencies

**Correctness:**

- [ ] Handles all edge cases
- [ ] Proper error handling
- [ ] Input validation
- [ ] No hardcoded values
- [ ] Security appropriate

### Phase 5: Handoff

**Do NOT create documentation files unless requested**

Provide summary:

- What was delivered
- DoD verification
- Key decisions (explain reasoning HERE, not in code)
- Follow-up items
- Testing notes

## Challenge Points

- Contradicts architecture? → Escalate, propose alternative
- Simpler approach? → Present comparison
- Edge cases unspecified? → List and confirm
- Breaks SOLID? → Refuse, suggest refactor
- Code smells? → Identify, propose cleaner design
- Unclear rules? → Demand testable criteria
- Vague DoD? → Make specific and measurable
- No error handling? → Ask about failure scenarios

## Related

**Task Management:**

- `.ai/categories/workflow/clickup-task.md` - Task standards

**TypeScript/JavaScript:**

- `.ai/categories/code-quality/code-comments.md` - Comment guidelines
- `.ai/categories/code-quality/typescript.md` - TypeScript patterns

**General:**

- `.cursor/rules/commit-rules.mdc` - Commit conventions
- `.cursor/rules/pull-request-rules.mdc` - PR standards
- `.ai/categories/workflow/pull-request.md` - PR analysis guidelines
