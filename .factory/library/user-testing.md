# User Testing

## Validation Surface
- **Primary surface:** Browser (agent-browser) at http://localhost:8080
- **Routes:** / (templates), /start (profile), /promotion (promotion builder)
- **Tool:** agent-browser skill for all UI assertions
- **Unit tests:** vitest for utility functions and React component tests

## Validation Concurrency
- **Max concurrent browser validators:** 3
- **Machine specs:** 7.7 GB RAM, 8 CPU cores, ~3.6 GB available
- **Per-instance cost:** ~300 MB (browser) + ~200 MB (dev server)
- **Rationale:** 3 × 300 MB + 200 MB = 1.1 GB, within 70% headroom of 3.6 GB available (2.5 GB usable)
