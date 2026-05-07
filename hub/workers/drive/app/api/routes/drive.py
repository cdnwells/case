from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from ...models.drive import DriveFile, DriveFileListResponse, DriveFileUploadRequest
from ...services.drive_service import DriveServiceError, drive_service

router = APIRouter()


def as_http_error(error: DriveServiceError) -> HTTPException:
    return HTTPException(status_code=error.status_code, detail=error.message)


@router.get("/files", response_model=DriveFileListResponse)
async def list_files(
    q: str = Query(default=""),
    pageToken: str = Query(default=""),
):
    try:
        files, next_page_token = drive_service.list_files(query=q, page_token=pageToken)
        return DriveFileListResponse(files=files, nextPageToken=next_page_token)
    except DriveServiceError as error:
        raise as_http_error(error) from error


@router.post("/files", response_model=DriveFile)
async def upload_file(request: DriveFileUploadRequest):
    try:
        return drive_service.upload_file(request)
    except DriveServiceError as error:
        raise as_http_error(error) from error


@router.get("/files/{file_id}/metadata", response_model=DriveFile)
async def get_file_metadata(file_id: str):
    try:
        return drive_service.get_metadata(file_id)
    except DriveServiceError as error:
        raise as_http_error(error) from error


@router.get("/files/{file_id}/download")
async def download_file(file_id: str):
    try:
        metadata, content = drive_service.download_file(file_id)
    except DriveServiceError as error:
        raise as_http_error(error) from error

    quoted_name = metadata.name.replace("\\", "\\\\").replace('"', '\\"')
    return Response(
        content=content,
        media_type=metadata.mimeType,
        headers={
            "Content-Disposition": f'attachment; filename="{quoted_name}"',
            "Content-Length": str(len(content)),
            "X-Drive-File-Id": metadata.driveFileId,
            "X-Drive-File-Name": metadata.name,
        },
    )
