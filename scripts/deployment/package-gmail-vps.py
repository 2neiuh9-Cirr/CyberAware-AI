"""Create a Linux-friendly VPS ZIP with executable directory permissions."""

from datetime import datetime
from pathlib import Path
from stat import S_IFDIR, S_IFREG
from sys import argv
from zipfile import ZIP_DEFLATED, ZIP_STORED, ZipFile, ZipInfo


ITEMS = (
    "backend", "shared", "src", "public", "dist",
    "server.ts", "package.json", "package-lock.json",
    "vite.config.ts", "tsconfig.json", "index.html",
)


def add_entry(archive: ZipFile, root: Path, path: Path) -> None:
    name = path.relative_to(root).as_posix()
    modified = datetime.fromtimestamp(path.stat().st_mtime).timetuple()[:6]
    if path.is_dir():
        info = ZipInfo(name + "/", modified)
        info.create_system = 3
        info.compress_type = ZIP_STORED
        info.external_attr = ((S_IFDIR | 0o755) << 16) | 0x10
        archive.writestr(info, b"")
    else:
        info = ZipInfo(name, modified)
        info.create_system = 3
        info.compress_type = ZIP_DEFLATED
        info.external_attr = (S_IFREG | 0o644) << 16
        archive.writestr(info, path.read_bytes())


def main() -> None:
    root = Path(argv[1]).resolve()
    package_name = argv[2] if len(argv) > 2 else "cyberaware-gmail-v1-vps.zip"
    if Path(package_name).name != package_name or not package_name.endswith(".zip"):
        raise ValueError("Package name must be a ZIP filename")
    destination = root / "deploy" / "packages" / package_name
    paths = [root / item for item in ITEMS]
    missing = [str(path) for path in paths if not path.exists()]
    if missing:
        raise FileNotFoundError("Missing package items: " + ", ".join(missing))
    destination.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(destination, "w") as archive:
        for path in paths:
            add_entry(archive, root, path)
            if path.is_dir():
                for child in sorted(path.rglob("*")):
                    if child.is_symlink():
                        raise ValueError(f"Symlink not supported in VPS package: {child}")
                    add_entry(archive, root, child)
    print(destination)


if __name__ == "__main__":
    main()
