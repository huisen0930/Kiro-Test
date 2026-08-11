# Requirements — <Feature Name>

> Copy this folder to `.kiro/specs/<feature>/` and fill it in. Requirements come first:
> they define WHAT and the acceptance criteria. Keep them testable.

## Introduction

<One paragraph: what this feature is, who it's for, and the value it delivers.>

## Requirements

### Requirement 1: <short title>

**User story:** As a <role>, I want <capability>, so that <benefit>.

**Acceptance criteria** (EARS style):

1. WHEN <trigger/condition> THEN the system SHALL <observable behavior>.
2. WHEN <trigger/condition> THEN the system SHALL <observable behavior>.
3. IF <edge case> THEN the system SHALL <how it's handled>.

### Requirement 2: <short title>

**User story:** As a <role>, I want <capability>, so that <benefit>.

**Acceptance criteria:**

1. WHEN <...> THEN the system SHALL <...>.

## Non-functional requirements

- <e.g. no dependencies with native build steps; installs cross-platform.>
- <e.g. all timestamps are ISO-8601 UTC at the API boundary.>

## Out of scope

- <Explicitly list what this feature does NOT cover, to keep the surface sharp.>
