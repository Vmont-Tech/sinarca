import hashlib

ALLOWED_EXTENSIONS = [
    ".pdf",
    ".docx",
    ".jpg",
    ".jpeg",
    ".png"
]

MAX_FILE_SIZE = 50 * 1024 * 1024


def validate_extension(filename: str):
    return any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS)


def validate_size(file_size: int):
    return file_size <= MAX_FILE_SIZE


def generate_sha256(file_path: str):
    sha256 = hashlib.sha256()

    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha256.update(chunk)

    return sha256.hexdigest()