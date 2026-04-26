"""플러그인(MCP 서버) 관리 API — .claude/settings.local.json mcpServers 읽기/쓰기"""
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

SETTINGS_FILE = Path(__file__).resolve().parent.parent.parent / ".claude" / "settings.local.json"

MCP_INFO = {
    "context7": {"display_name": "Context7", "description": "라이브러리 최신 공식 문서를 실시간 조회.", "usage": "코드 작성 시 자동으로 최신 API 문서를 참조.", "requires_key": False},
    "github": {"display_name": "GitHub", "description": "Issue/PR 관리.", "usage": "'이슈 만들어줘' 등.", "requires_key": True, "key_name": "GITHUB_PERSONAL_ACCESS_TOKEN"},
    "postgres": {"display_name": "PostgreSQL", "description": "DB 직접 쿼리.", "usage": "'사용자 테이블 확인해줘' 등.", "requires_key": True, "key_name": "DATABASE_URL"},
    "puppeteer": {"display_name": "Puppeteer", "description": "헤드리스 브라우저로 스크린샷/UI 테스트.", "usage": "'스크린샷 찍어줘' 등.", "requires_key": False},
    "sequential-thinking": {"display_name": "Sequential Thinking", "description": "복잡한 문제를 단계별로 추론.", "usage": "복잡한 설계/디버깅 시 자동 활용.", "requires_key": False},
    "memory": {"display_name": "Memory", "description": "대화 간 장기 기억.", "usage": "'기억해줘' 등.", "requires_key": False},
    "brave-search": {"display_name": "Brave Search", "description": "웹 검색.", "usage": "'검색해줘' 등.", "requires_key": True, "key_name": "BRAVE_API_KEY"},
    "filesystem": {"display_name": "Filesystem", "description": "확장된 파일 시스템 작업.", "usage": "복잡한 파일 작업 시 자동 활용.", "requires_key": False},
    "fetch": {"display_name": "Fetch", "description": "외부 HTTP API 호출.", "usage": "'이 API 호출해줘' 등.", "requires_key": False},
    "docker": {"display_name": "Docker", "description": "Docker 컨테이너 관리.", "usage": "'컨테이너 목록 보여줘' 등.", "requires_key": False},
}


def _read_settings() -> dict:
    if not SETTINGS_FILE.exists():
        return {}
    return json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))


def _write_settings(data: dict):
    SETTINGS_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


@router.get("/list")
def list_plugins():
    settings = _read_settings()
    servers = settings.get("mcpServers", {})
    result = []
    for key, config in servers.items():
        info = MCP_INFO.get(key, {})
        result.append({
            "key": key,
            "display_name": info.get("display_name", key),
            "description": info.get("description", ""),
            "usage": info.get("usage", ""),
            "requires_key": info.get("requires_key", False),
            "key_name": info.get("key_name", ""),
            "command": config.get("command", ""),
            "args": config.get("args", []),
            "env": {k: ("***" if v else "") for k, v in config.get("env", {}).items()},
            "is_configured": all(bool(v) for v in config.get("env", {}).values()) if config.get("env") else True,
        })
    return result


@router.get("/{plugin_key}")
def get_plugin(plugin_key: str):
    settings = _read_settings()
    servers = settings.get("mcpServers", {})
    if plugin_key not in servers:
        raise HTTPException(status_code=404, detail="Plugin not found")
    config = servers[plugin_key]
    info = MCP_INFO.get(plugin_key, {})
    return {
        "key": plugin_key, "display_name": info.get("display_name", plugin_key),
        "description": info.get("description", ""), "usage": info.get("usage", ""),
        "requires_key": info.get("requires_key", False), "key_name": info.get("key_name", ""),
        "command": config.get("command", ""), "args": config.get("args", []),
        "env": config.get("env", {}),
        "is_configured": all(bool(v) for v in config.get("env", {}).values()) if config.get("env") else True,
    }


class PluginUpdateRequest(BaseModel):
    env: dict[str, str] | None = None


@router.put("/{plugin_key}")
def update_plugin(plugin_key: str, body: PluginUpdateRequest):
    settings = _read_settings()
    servers = settings.get("mcpServers", {})
    if plugin_key not in servers:
        raise HTTPException(status_code=404, detail="Plugin not found")
    if body.env is not None:
        if "env" not in servers[plugin_key]:
            servers[plugin_key]["env"] = {}
        servers[plugin_key]["env"].update(body.env)
    settings["mcpServers"] = servers
    _write_settings(settings)
    return {"status": "updated", "key": plugin_key}


class PluginCreateRequest(BaseModel):
    key: str
    command: str
    args: list[str]
    env: dict[str, str] | None = None
    display_name: str = ""
    description: str = ""


@router.post("/add")
def add_plugin(body: PluginCreateRequest):
    settings = _read_settings()
    if "mcpServers" not in settings:
        settings["mcpServers"] = {}
    if body.key in settings["mcpServers"]:
        raise HTTPException(status_code=400, detail="Plugin already exists")
    new_server = {"command": body.command, "args": body.args}
    if body.env:
        new_server["env"] = body.env
    settings["mcpServers"][body.key] = new_server
    _write_settings(settings)
    return {"status": "added", "key": body.key}


@router.delete("/{plugin_key}")
def remove_plugin(plugin_key: str):
    settings = _read_settings()
    servers = settings.get("mcpServers", {})
    if plugin_key not in servers:
        raise HTTPException(status_code=404, detail="Plugin not found")
    del servers[plugin_key]
    settings["mcpServers"] = servers
    _write_settings(settings)
    return {"status": "removed", "key": plugin_key}
