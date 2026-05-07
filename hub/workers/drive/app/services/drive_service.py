import base64
import binascii
import io
import os
import re
from typing import Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseUpload

from ..config import settings
from ..models.drive import DriveFile, DriveFileUploadRequest

DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive"]
GOOGLE_WORKSPACE_MIME_PREFIX = "application/vnd.google-apps."
MIME_TYPE_PATTERN = re.compile(
    r"^[a-z0-9][a-z0-9!#$&^_.+-]*/[a-z0-9][a-z0-9!#$&^_.+-]*$",
    re.IGNORECASE,
)


class DriveServiceError(Exception):
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def normalize_size_bytes(value: object) -> int:
    if value is None or value == "":
        return 0
    try:
        return max(0, int(value))
    except (TypeError, ValueError):
        return 0


def to_drive_file(metadata: dict) -> DriveFile:
    file_id = str(metadata.get("id") or "").strip()
    name = str(metadata.get("name") or "").strip()
    mime_type = str(metadata.get("mimeType") or "").strip().lower()
    if not file_id or not name or not mime_type:
        raise DriveServiceError("Drive returned invalid file metadata")

    return DriveFile(
        id=file_id,
        driveFileId=file_id,
        name=name,
        mimeType=mime_type,
        sizeBytes=normalize_size_bytes(metadata.get("size")),
        webViewLink=metadata.get("webViewLink") or None,
        createdAt=metadata.get("createdTime") or None,
    )


def validate_file_name(name: str) -> str:
    normalized = name.strip()
    if (
        not normalized
        or len(normalized) > 180
        or normalized in {".", ".."}
        or any(char in normalized for char in ["\x00", "/", "\\"])
    ):
        raise DriveServiceError("name must be a safe non-empty file name", 400)
    return normalized


def validate_mime_type(mime_type: str) -> str:
    normalized = mime_type.strip().lower()
    if not MIME_TYPE_PATTERN.match(normalized):
        raise DriveServiceError("mimeType must be a valid MIME type", 400)
    return normalized


def decode_upload_content(request: DriveFileUploadRequest) -> bytes:
    if request.encoding == "utf8":
        content = request.content.encode("utf-8")
    else:
        try:
            content = base64.b64decode(request.content, validate=True)
        except (binascii.Error, ValueError) as error:
            raise DriveServiceError("content must be valid base64", 400) from error

    if not content:
        raise DriveServiceError("content must not be empty", 400)

    if len(content) > settings.DRIVE_MAX_FILE_BYTES:
        raise DriveServiceError("file payload is too large", 413)

    return content


def escape_drive_query_value(value: str) -> str:
    return value.replace("\\", "\\\\").replace("'", "\\'")


class DriveService:
    def __init__(self):
        self._service = None

    def _load_credentials(self) -> Credentials:
        creds: Optional[Credentials] = None
        token_path = settings.DRIVE_TOKEN_PATH

        if os.path.exists(token_path):
            creds = Credentials.from_authorized_user_file(token_path, DRIVE_SCOPES)

        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(token_path, "w", encoding="utf-8") as token_file:
                token_file.write(creds.to_json())

        if creds and creds.valid:
            return creds

        if not settings.DRIVE_ALLOW_INTERACTIVE_AUTH:
            raise DriveServiceError(
                "Drive OAuth token is missing or expired; configure DRIVE_TOKEN_PATH",
                503,
            )

        if not os.path.exists(settings.DRIVE_CREDENTIALS_PATH):
            raise DriveServiceError("Drive credentials file was not found", 503)

        flow = InstalledAppFlow.from_client_secrets_file(
            settings.DRIVE_CREDENTIALS_PATH,
            DRIVE_SCOPES,
        )
        creds = flow.run_local_server(port=0)
        with open(token_path, "w", encoding="utf-8") as token_file:
            token_file.write(creds.to_json())

        return creds

    def _get_service(self):
        if self._service is None:
            self._service = build(
                "drive",
                "v3",
                credentials=self._load_credentials(),
                cache_discovery=False,
            )
        return self._service

    def list_files(self, query: str = "", page_token: str = ""):
        conditions = ["trashed = false"]
        if settings.DRIVE_UPLOAD_PARENT_ID:
            conditions.append(f"'{escape_drive_query_value(settings.DRIVE_UPLOAD_PARENT_ID)}' in parents")
        else:
            conditions.append("'root' in parents")

        if query.strip():
            conditions.append(f"name contains '{escape_drive_query_value(query.strip())}'")

        try:
            response = (
                self._get_service()
                .files()
                .list(
                    q=" and ".join(conditions),
                    pageSize=settings.DRIVE_LIST_PAGE_SIZE,
                    pageToken=page_token or None,
                    fields="nextPageToken, files(id, name, mimeType, size, webViewLink, createdTime)",
                    orderBy="modifiedTime desc",
                )
                .execute()
            )
        except HttpError as error:
            raise DriveServiceError(f"Drive list failed: {error}", error.resp.status) from error

        return (
            [to_drive_file(file_metadata) for file_metadata in response.get("files", [])],
            response.get("nextPageToken") or None,
        )

    def upload_file(self, request: DriveFileUploadRequest) -> DriveFile:
        name = validate_file_name(request.name)
        mime_type = validate_mime_type(request.mimeType)
        content = decode_upload_content(request)
        body = {"name": name}

        if settings.DRIVE_UPLOAD_PARENT_ID:
            body["parents"] = [settings.DRIVE_UPLOAD_PARENT_ID]

        media = MediaIoBaseUpload(
            io.BytesIO(content),
            mimetype=mime_type,
            resumable=False,
        )

        try:
            metadata = (
                self._get_service()
                .files()
                .create(
                    body=body,
                    media_body=media,
                    fields="id, name, mimeType, size, webViewLink, createdTime",
                )
                .execute()
            )
        except HttpError as error:
            raise DriveServiceError(f"Drive upload failed: {error}", error.resp.status) from error

        return to_drive_file(metadata)

    def get_metadata(self, file_id: str) -> DriveFile:
        if not file_id.strip():
            raise DriveServiceError("file_id must be non-empty", 400)

        try:
            metadata = (
                self._get_service()
                .files()
                .get(
                    fileId=file_id,
                    fields="id, name, mimeType, size, webViewLink, createdTime",
                )
                .execute()
            )
        except HttpError as error:
            raise DriveServiceError(f"Drive metadata lookup failed: {error}", error.resp.status) from error

        return to_drive_file(metadata)

    def download_file(self, file_id: str) -> tuple[DriveFile, bytes]:
        metadata = self.get_metadata(file_id)
        if metadata.mimeType.startswith(GOOGLE_WORKSPACE_MIME_PREFIX):
            raise DriveServiceError(
                "Google Workspace documents cannot be downloaded as raw files in v1",
                415,
            )

        try:
            content = (
                self._get_service()
                .files()
                .get_media(fileId=file_id)
                .execute()
            )
        except HttpError as error:
            raise DriveServiceError(f"Drive download failed: {error}", error.resp.status) from error

        if not isinstance(content, bytes):
            content = bytes(content)

        if len(content) > settings.DRIVE_MAX_FILE_BYTES:
            raise DriveServiceError("downloaded file is too large", 413)

        return metadata, content


drive_service = DriveService()
