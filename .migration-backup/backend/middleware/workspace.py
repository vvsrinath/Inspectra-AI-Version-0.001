import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


WORKSPACE_HEADER = "x-workspace-id"


class WorkspaceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        wid = request.headers.get(WORKSPACE_HEADER)
        if not wid or len(wid) < 8:
            wid = str(uuid.uuid4())
        request.state.workspace_id = wid
        response = await call_next(request)
        response.headers[WORKSPACE_HEADER] = wid
        return response
