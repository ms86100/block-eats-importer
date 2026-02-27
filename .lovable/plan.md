

## Root Cause (Verified)

The previous fix only re-indented the heredoc content, but the fundamental problem persists: **Codemagic's YAML parser does not correctly handle the `deviceToken: Data` pattern inside a `|` block scalar**. It interprets the colon-space as a YAML mapping delimiter regardless of being inside a literal block. Re-indenting does not fix this — the heredoc approach itself is the problem.

## Fix

**Replace the shell heredoc (`<< 'SWIFT' ... SWIFT`) with `printf` statements** in both locations (ios-release workflow lines 46-62, release-all workflow lines 232-248). This completely eliminates any YAML-parseable colon patterns from the script content.

The Swift code will be written using `printf '%s\n'` with each line as a separate argument, or a single `printf` with `\n` separators. The content itself stays identical — only the shell mechanism for writing it changes.

### Files changed
- `codemagic.yaml` — two locations (lines 46-62 and lines 232-248)

### What must NOT be touched
- All other scripts, workflows, artifacts, and publishing config
- The actual Swift code content being injected (must remain identical)

