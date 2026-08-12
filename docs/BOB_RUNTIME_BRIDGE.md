# IBM Bob local bridge

LunaGuard includes an **optional read-only MCP bridge** in `scripts/bob_mcp_server.py` plus a project-level `.bob/mcp.json` configuration.

When LunaGuard is running locally, IBM Bob can use the bridge to:

- check `/health`
- inspect IBM watsonx.ai / Granite status
- inspect the NASA / Canadian Space Agency grounding catalog
- ask the LunaGuard Copilot a grounded question

The customer-facing LunaGuard Copilot does **not** route its production answers through the Bob IDE. IBM Granite on watsonx.ai remains the runtime model. The bridge instead lets Bob connect to LunaGuard as a development/operations tool through MCP.

No IBM Cloud keys are stored in `.bob/mcp.json`.
