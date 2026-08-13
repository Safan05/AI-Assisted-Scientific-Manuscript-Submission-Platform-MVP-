import boto3
from botocore.client import Config
from io import BytesIO
from .base import StorageService
from app.core.config import settings
import asyncio

class S3CompatibleStorage(StorageService):
    def __init__(self):
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.STORAGE_ENDPOINT_URL,
            aws_access_key_id=settings.STORAGE_ACCESS_KEY,
            aws_secret_access_key=settings.STORAGE_SECRET_KEY,
            region_name=settings.STORAGE_REGION,
            config=Config(s3={"addressing_style": "path"}),
        )
        self.bucket = settings.STORAGE_BUCKET_NAME

    async def upload(self, key, data, content_type="application/octet-stream"):
        def _upload():
            self.client.upload_fileobj(
                data, self.bucket, key,
                ExtraArgs={"ContentType": content_type},
            )
            return f"{settings.STORAGE_CDN_URL}/{key}"
        return await asyncio.to_thread(_upload)

    async def download(self, key):
        def _download():
            buf = BytesIO()
            self.client.download_fileobj(self.bucket, key, buf)
            return buf.getvalue()
        return await asyncio.to_thread(_download)

    async def delete(self, key):
        def _delete():
            self.client.delete_object(Bucket=self.bucket, Key=key)
        await asyncio.to_thread(_delete)

    async def generate_presigned_url(self, key, expires_in=3600):
        def _presigned():
            return self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=expires_in,
            )
        return await asyncio.to_thread(_presigned)

    async def list_objects(self, prefix, max_keys=1000):
        def _list():
            resp = self.client.list_objects_v2(
                Bucket=self.bucket, Prefix=prefix, MaxKeys=max_keys
            )
            return [obj["Key"] for obj in resp.get("Contents", [])]
        return await asyncio.to_thread(_list)
