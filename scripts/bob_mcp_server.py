"""Minimal local MCP bridge so IBM Bob can inspect a running LunaGuard stack.

This bridge is optional and does not participate in the customer-facing Copilot
runtime. It exposes read-only tools over STDIO and calls LunaGuard's localhost
API. No credentials are embedded in the MCP configuration.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from typing import Any

BASE_URL = os.environ.get("LUNAGUARD_API_URL", "http://localhost:8000").rstrip("/")
PROTOCOL_VERSION = "2025-03-26"


def write(message: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(message, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def http_json(path: str, *, method: str = "GET", body: dict[str, Any] | None = None) -> Any:
    payload = None if body is None else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=payload,
        method=method,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=15) as response:  # noqa: S310 - localhost by default
        return json.loads(response.read().decode("utf-8"))


def tool_result(value: Any) -> dict[str, Any]:
    return {
        "content": [
            {
                "type": "text",
                "text": json.dumps(value, indent=2, ensure_ascii=False),
            }
        ],
        "isError": False,
    }


def tool_error(message: str) -> dict[str, Any]:
    return {"content": [{"type": "text", "text": message}], "isError": True}


def handle_tool(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    try:
        if name == "lunaguard_health":
            return tool_result(http_json("/health"))
        if name == "lunaguard_sources":
            return tool_result(http_json("/api/ai/sources"))
        if name == "lunaguard_ai_status":
            return tool_result(http_json("/api/ai/status"))
        if name == "lunaguard_ask_copilot":
            question = str(arguments.get("question", "")).strip()
            if not question:
                return tool_error("question is required")
            return tool_result(
                http_json(
                    "/api/ai/copilot",
                    method="POST",
                    body={
                        "question": question,
                        "mission_context": {
                            "client": "IBM Bob MCP bridge",
                            "safety_rule": "deterministic route metrics remain authoritative",
                        },
                    },
                )
            )
        return tool_error(f"Unknown tool: {name}")
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        return tool_error(f"LunaGuard API request failed: {exc}")


TOOLS = [
    {
        "name": "lunaguard_health",
        "description": "Check whether the local LunaGuard mission API is healthy.",
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "lunaguard_ai_status",
        "description": "Read LunaGuard's IBM watsonx.ai / Granite runtime status and safety guardrails.",
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "lunaguard_sources",
        "description": "Read the NASA and Canadian Space Agency source catalog used by LunaGuard.",
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "lunaguard_ask_copilot",
        "description": "Ask the running LunaGuard mission copilot a grounded question.",
        "inputSchema": {
            "type": "object",
            "properties": {"question": {"type": "string", "minLength": 2}},
            "required": ["question"],
            "additionalProperties": False,
        },
    },
]


def handle(message: dict[str, Any]) -> None:
    method = message.get("method")
    request_id = message.get("id")

    if request_id is None:
        return

    if method == "initialize":
        write(
            {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "protocolVersion": message.get("params", {}).get("protocolVersion") or PROTOCOL_VERSION,
                    "capabilities": {"tools": {"listChanged": False}},
                    "serverInfo": {"name": "lunaguard-bob-bridge", "version": "1.0.0"},
                },
            }
        )
        return

    if method == "ping":
        write({"jsonrpc": "2.0", "id": request_id, "result": {}})
        return

    if method == "tools/list":
        write({"jsonrpc": "2.0", "id": request_id, "result": {"tools": TOOLS}})
        return

    if method == "tools/call":
        params = message.get("params") or {}
        result = handle_tool(str(params.get("name", "")), params.get("arguments") or {})
        write({"jsonrpc": "2.0", "id": request_id, "result": result})
        return

    write(
        {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {"code": -32601, "message": f"Method not found: {method}"},
        }
    )


for raw in sys.stdin:
    line = raw.strip()
    if not line:
        continue
    try:
        handle(json.loads(line))
    except Exception as exc:  # noqa: BLE001 - keep the bridge alive for the IDE
        write({"jsonrpc": "2.0", "id": None, "error": {"code": -32603, "message": str(exc)}})
