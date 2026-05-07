from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class DriveFile(BaseModel):
    id: str
    driveFileId: str
    name: str
    mimeType: str
    sizeBytes: int = 0
    webViewLink: Optional[str] = None
    createdAt: Optional[datetime] = None


class DriveFileListResponse(BaseModel):
    files: list[DriveFile]
    nextPageToken: Optional[str] = None


class DriveFileUploadRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=180)
    mimeType: str = Field(..., min_length=1, max_length=120)
    encoding: Literal["utf8", "base64"]
    content: str = Field(..., min_length=1)


class ErrorResponse(BaseModel):
    error: str
    message: str
    request_id: Optional[str] = None
