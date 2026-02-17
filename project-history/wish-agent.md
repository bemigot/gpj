# Agent wishlist

## Include session-id in commit messages

So when user issues `/exit`, they need not look for the
`claude --resume 29e1c781-8949-453c-9a93-f39be2029de5` hint
across terminal windows, or scroll back in search of it.

Status: not implementable yet - the agent has no access to its own session ID.
Could be done via a hook or env variable injection.
