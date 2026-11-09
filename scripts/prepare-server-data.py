"""Create a consistent, single-file SQLite migration archive for the VPS."""

from pathlib import Path
from tempfile import TemporaryDirectory
from contextlib import closing
import sqlite3
import zipfile


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data" / "auth.sqlite"
AVATARS = ROOT / "data" / "avatars"
ARCHIVE = ROOT / "data" / "cyberaware-data-migration.zip"

if not SOURCE.is_file():
    raise SystemExit("Missing local data/auth.sqlite")

with TemporaryDirectory(prefix="cyberaware-migration-") as temporary:
    snapshot = Path(temporary) / "auth.sqlite"
    with closing(sqlite3.connect(f"file:{SOURCE.as_posix()}?mode=ro", uri=True)) as source:
        with closing(sqlite3.connect(snapshot)) as target:
            source.backup(target)
            # Browser sessions and short-lived codes cannot be reused with the
            # production JWT secret. People will sign in again after migration.
            for table in (
                "sessions",
                "oauth_states",
                "password_resets",
                "recovery_codes",
                "recovery_grants",
                "pending_registrations",
                "revoked_tokens",
                "chat_usage",
            ):
                target.execute(f"DELETE FROM {table}")
            target.commit()
            target.execute("PRAGMA journal_mode=DELETE")
            target.execute("VACUUM")
            integrity = target.execute("PRAGMA integrity_check").fetchone()[0]
            foreign_keys = target.execute("PRAGMA foreign_key_check").fetchall()
            users = target.execute("SELECT COUNT(*) FROM users").fetchone()[0]
            if integrity != "ok" or foreign_keys:
                raise SystemExit("Migration database failed integrity checks")

    with zipfile.ZipFile(ARCHIVE, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        bundle.write(snapshot, "auth.sqlite")
        if AVATARS.is_dir():
            for avatar in AVATARS.rglob("*"):
                if avatar.is_file():
                    bundle.write(avatar, avatar.relative_to(ROOT / "data").as_posix())

    with zipfile.ZipFile(ARCHIVE) as bundle:
        if bundle.testzip() is not None:
            raise SystemExit("Migration archive failed ZIP integrity check")
        avatar_count = sum(name.startswith("avatars/") for name in bundle.namelist())

print(f"Prepared {ARCHIVE.name}: {users} users, {avatar_count} avatar files")
