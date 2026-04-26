import os
import shutil
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import database
from database import create_db_and_tables
from routers import auth, admin, docs, skills, plugins, boards, comments, files


def _get_uploads_dir() -> Path:
    """Resolve uploads dir: UPLOAD_DIR env (Docker) > project_root/uploads (local).
    Empty-string defense: Path("") resolves to CWD, so .strip() and falsy-check first."""
    env_val = os.getenv("UPLOAD_DIR", "").strip()
    if env_val:
        d = Path(env_val)
    else:
        d = Path(__file__).resolve().parent.parent / "uploads"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _copy_gallery_defaults():
    """Copy bundled gallery defaults into uploads/ on startup (only missing files).
    Source is backend/gallery_defaults/ — bundled in Docker image, immune to VOLUME mount."""
    defaults_dir = Path(__file__).resolve().parent / "gallery_defaults"
    if not defaults_dir.is_dir():
        print(f"[gallery-defaults] Not found: {defaults_dir}")
        return
    uploads = _get_uploads_dir()
    copied = 0
    for src in defaults_dir.glob("gallery-*.jpg"):
        dst = uploads / src.name
        if not dst.exists():
            shutil.copy2(src, dst)
            copied += 1
    print(f"[gallery-defaults] Copied {copied} files to {uploads}")


def _seed_admin():
    """Ensure default superadmin account exists on startup."""
    from sqlmodel import Session, select
    from models import User
    import bcrypt
    username = os.getenv("SUPERADMIN_USERNAME", "admin")
    password = os.getenv("SUPERADMIN_PASSWORD", "admin1234")
    with Session(database.engine) as session:
        existing = session.exec(select(User).where(User.username == username)).first()
        if not existing:
            hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
            user = User(
                username=username,
                email=f"{username}@sodamjobs.local",
                hashed_password=hashed,
                role="superadmin",
            )
            session.add(user)
            session.commit()
            print(f"[seed] SuperAdmin '{username}' created.")


def _seed_docs():
    """Sync docs/ markdown files into DB (upsert by key)."""
    from sqlmodel import Session, select
    from models.document import Document

    DOC_FILES = {
        "dev-plan": ("개발계획", "dev-plan.md"),
        "bugfix-log": ("버그수정 로그", "bugfix-log.md"),
        "upgrade-log": ("업그레이드 로그", "upgrade-log.md"),
        "work-log": ("작업일지", "work-log.md"),
    }

    docs_dir = Path("/app/docs")
    if not docs_dir.exists():
        docs_dir = Path(__file__).resolve().parent.parent / "docs"
    if not docs_dir.exists():
        print("[seed_docs] docs/ not found, skipping.")
        return

    try:
        with Session(database.engine) as session:
            synced = 0
            for key, (title, filename) in DOC_FILES.items():
                filepath = docs_dir / filename
                if not filepath.exists():
                    print(f"[seed_docs] missing: {filepath}")
                    continue
                content = filepath.read_text(encoding="utf-8")
                existing = session.exec(select(Document).where(Document.key == key)).first()
                if existing:
                    existing.content = content
                    existing.title = title
                    session.add(existing)
                else:
                    session.add(Document(key=key, title=title, content=content))
                synced += 1
            session.commit()
            print(f"[seed_docs] synced {synced}/{len(DOC_FILES)} docs from {docs_dir}")
    except Exception as e:
        print(f"[seed_docs] ERROR: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _copy_gallery_defaults()
    create_db_and_tables()
    _seed_admin()
    _seed_docs()
    yield


app = FastAPI(title="SodamJobs API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        os.getenv("FRONTEND_URL", ""),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(docs.router, prefix="/api/docs", tags=["docs"])
app.include_router(skills.router, prefix="/api/skills", tags=["skills"])
app.include_router(plugins.router, prefix="/api/plugins", tags=["plugins"])
app.include_router(boards.router, prefix="/api/boards", tags=["boards"])
app.include_router(comments.router, prefix="/api/comments", tags=["comments"])
app.include_router(files.router, prefix="/api/files", tags=["files"])


@app.get("/health")
def health_check():
    """Health + deploy diagnostics."""
    try:
        from sqlmodel import Session, select, func
        from models.document import Document
        from models import Post, FileRecord
        with Session(database.engine) as session:
            doc_count = session.exec(select(func.count(Document.id))).one()
            post_count = session.exec(select(func.count(Post.id))).one()
            file_count = session.exec(select(func.count(FileRecord.id))).one()
        uploads = _get_uploads_dir()
        upload_files = [f.name for f in uploads.iterdir()] if uploads.is_dir() else []
        return {
            "status": "ok",
            "db": "connected",
            "documents": doc_count,
            "posts": post_count,
            "files": file_count,
            "uploads_dir": str(uploads),
            "uploads_files": upload_files,
        }
    except Exception as e:
        return {"status": "error", "db": str(e)}


# Serve uploaded files via explicit route (NOT StaticFiles mount — conflicts with Docker VOLUME)
@app.get("/uploads/{filename:path}")
def serve_upload(filename: str):
    filepath = _get_uploads_dir() / filename
    if filepath.is_file():
        return FileResponse(filepath)
    raise HTTPException(status_code=404, detail=f"File not found: {filename}")


# Serve frontend static files in production (Docker copies build output to /app/static)
_static_dir = Path(__file__).resolve().parent / "static"
if _static_dir.exists():
    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        file_path = _static_dir / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(_static_dir / "index.html")

    app.mount("/assets", StaticFiles(directory=_static_dir / "assets"), name="static-assets")
