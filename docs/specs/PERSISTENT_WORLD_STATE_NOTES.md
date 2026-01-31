# Future Requirement: Persistent World State

**Status**: Future Requirement (Post-R011)
**Related Release**: Multiplayer / Server-Authoritative

## Concept
The game world is persistent and evolves independently of any single player's presence.

## Key Principles
- **World Evolution**: The game state can change while a player is offline due to:
  - Valid offline processes (e.g., resource accumulation).
  - Actions by AI entities.
  - Actions by other players (in multiplayer).
  - Activity on other asteroids/locations.
- **Load Behavior**: 
  - Loading the game should **sync** the client to the *current* server-authoritative state.
  - It should **not** simply "rewind" to the local save snapshot if the server state has advanced.
  - Local save data serves as a cache/backup, but Server Authority is final.
