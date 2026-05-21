import hashlib
import os
from cryptography.fernet import Fernet

import boto3

from backend.core.config import settings


class S3Service:
    def __init__(self):
        self.s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )

        self.bucket = settings.S3_BUCKET

        self.backup_bucket = settings.S3_BACKUP_BUCKET

        self.cipher = Fernet(settings.AES_SECRET_KEY.encode())

    def generate_sha256(self, file_path: str):
        sha256 = hashlib.sha256()

        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256.update(chunk)

        return sha256.hexdigest()

    def encrypt_file(self, file_path: str):
        with open(file_path, "rb") as f:
            data = f.read()

        encrypted = self.cipher.encrypt(data)

        encrypted_path = f"{file_path}.enc"

        with open(encrypted_path, "wb") as f:
            f.write(encrypted)

        return encrypted_path

    def decrypt_file(self, encrypted_path: str):
        with open(encrypted_path, "rb") as f:
            data = f.read()

        decrypted = self.cipher.decrypt(data)

        original_path = encrypted_path.replace(".enc", "")

        with open(original_path, "wb") as f:
            f.write(decrypted)

        return original_path

    def upload_file(self, file_path: str, key: str):
        self.s3.upload_file(file_path, self.bucket, key)

        return f"https://{self.backup_bucket}.s3.amazonaws.com/{key}"