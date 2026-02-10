from fastapi import APIRouter, Depends, Request
from ...models.command import CommandRequest, CommandResponse
from ...services.ssh_service import ssh_service
from ...core.security import validate_command
from ..dependencies import authenticate

router = APIRouter()


@router.post("/command", response_model=CommandResponse)
async def execute_command(
    request: Request,
    auth: dict = Depends(authenticate),
):
    """Execute a shell command on the remote server via SSH"""
    content_type = request.headers.get("content-type", "")
    
    if "text/markdown" in content_type:
        body = await request.body()
        content = body.decode("utf-8")
        
        # Extract commands from markdown
        # Pattern looks for **Timeout:** Ns and ```shell ... ```
        # We'll split by "## Command" to handle metadata per command
        
        commands_to_run = []
        import re
        
        # Split into command blocks (skipping header)
        parts = re.split(r"## Command \d+", content)
        
        for part in parts[1:]:  # Skip preamble
            timeout = 30
            # diverse metadata
            timeout_match = re.search(r"\*\*Timeout:\*\*\s*(\d+)s", part)
            if timeout_match:
                timeout = int(timeout_match.group(1))
                
            cmd_match = re.search(r"```shell\n(.*?)\n```", part, re.DOTALL)
            if cmd_match:
                cmd_str = cmd_match.group(1).strip()
                commands_to_run.append((cmd_str, timeout))
        
        if not commands_to_run:
             return CommandResponse(
                success=False,
                stdout="",
                stderr="No shell commands found in markdown",
                exit_code=1,
                execution_time=0.0,
            )

        total_stdout = []
        total_stderr = []
        last_exit_code = 0
        total_time = 0.0
        
        for cmd, timeout in commands_to_run:
            validate_command(cmd)
            stdout, stderr, exit_code, exec_time = ssh_service.execute_command(
                command=cmd,
                timeout=timeout,
            )
            
            total_stdout.append(stdout)
            if stderr:
                total_stderr.append(stderr)
            
            last_exit_code = exit_code
            total_time += exec_time
            
            if exit_code != 0:
                break
                
        return CommandResponse(
            success=last_exit_code == 0,
            stdout="\n".join(total_stdout),
            stderr="\n".join(total_stderr),
            exit_code=last_exit_code,
            execution_time=round(total_time, 3),
        )

    # Default JSON handling
    try:
        data = await request.json()
        command_req = CommandRequest(**data)
    except Exception as e:
         return CommandResponse(
            success=False,
            stdout="",
            stderr=f"Invalid request format: {str(e)}",
            exit_code=1,
            execution_time=0.0,
        )

    validate_command(command_req.command)

    stdout, stderr, exit_code, execution_time = ssh_service.execute_command(
        command=command_req.command,
        timeout=command_req.timeout,
        working_directory=command_req.working_directory,
    )

    return CommandResponse(
        success=exit_code == 0,
        stdout=stdout,
        stderr=stderr,
        exit_code=exit_code,
        execution_time=round(execution_time, 3),
    )
