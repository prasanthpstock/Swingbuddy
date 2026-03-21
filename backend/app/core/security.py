import base64, hashlib
from cryptography.fernet import Fernet

def build_fernet(encryption_key: str) -> Fernet:
    digest = hashlib.sha256(encryption_key.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))

def encrypt_text(value: str, encryption_key: str) -> str:
    return build_fernet(encryption_key).encrypt(value.encode("utf-8")).decode("utf-8")

def decrypt_text(value: str, encryption_key: str) -> str:
    return build_fernet(encryption_key).decrypt(value.encode("utf-8")).decode("utf-8")
