# Cline's Memory Bank

This directory serves as Cline's persistent memory storage for the Morphopoiesis project. After each reset, Cline relies ENTIRELY on this Memory Bank to understand the project and continue work effectively.

## Structure

The Memory Bank consists of core files and optional context files, all in Markdown format:

### Core Files (Required)
1. `projectbrief.md`
   - Foundation document that shapes all other files
   - Defines core requirements and goals
   - Source of truth for project scope

2. `productContext.md`
   - Why this project exists
   - Problems it solves
   - How it should work
   - User experience goals

3. `activeContext.md`
   - Current work focus
   - Recent changes
   - Next steps
   - Active decisions and considerations
   - Important patterns and preferences
   - Learnings and project insights

4. `systemPatterns.md`
   - System architecture
   - Key technical decisions
   - Design patterns in use
   - Component relationships
   - Critical implementation paths

5. `techContext.md`
   - Technologies used
   - Development setup
   - Technical constraints
   - Dependencies
   - Tool usage patterns

6. `progress.md`
   - What works
   - What's left to build
   - Current status
   - Known issues
   - Evolution of project decisions

### Additional Context
Additional files/folders within memory-bank/ may be created when they help organize:
- Complex feature documentation
- Integration specifications
- API documentation
- Testing strategies
- Deployment procedures

## Documentation Updates

Memory Bank updates occur when:
1. Discovering new project patterns
2. After implementing significant changes
3. When user requests with **update memory bank**
4. When context needs clarification

REMEMBER: After every memory reset, Cline begins completely fresh. The Memory Bank is the only link to previous work. It must be maintained with precision and clarity, as effectiveness depends entirely on its accuracy.
