import paramiko
import time
import logging
from typing import Optional, Tuple
from ..config import settings
from ..core.exceptions import SSHConnectionException, SSHCommandException

logger = logging.getLogger(__name__)


class SSHService:
    def __init__(self):
        self._client: Optional[paramiko.SSHClient] = None

    def _get_client(self) -> paramiko.SSHClient:
        """Get or create SSH client connection"""
        if self._client is not None:
            try:
                self._client.get_transport().send_ignore()
                return self._client
            except Exception:
                self._client = None

        try:
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            key_path = settings.SSH_KEY_PATH
            passphrase = settings.SSH_KEY_PASSPHRASE or None

            client.connect(
                hostname=settings.SSH_HOST,
                port=settings.SSH_PORT,
                username=settings.SSH_USERNAME,
                key_filename=key_path,
                passphrase=passphrase,
                timeout=30,
            )

            self._client = client
            logger.info(f"SSH connection established to {settings.SSH_HOST}")
            return client

        except paramiko.AuthenticationException as e:
            raise SSHConnectionException("Authentication failed", e)
        except paramiko.SSHException as e:
            raise SSHConnectionException(f"SSH error: {str(e)}", e)
        except Exception as e:
            raise SSHConnectionException(f"Connection failed: {str(e)}", e)

    def execute_command(
        self,
        command: str,
        timeout: int = 30,
        working_directory: Optional[str] = None,
    ) -> Tuple[str, str, int, float]:
        """
        Execute a command via SSH.

        Returns:
            Tuple of (stdout, stderr, exit_code, execution_time)
        """
        client = self._get_client()

        if working_directory:
            command = f"cd {working_directory} && {command}"

        start_time = time.time()

        try:
            stdin, stdout, stderr = client.exec_command(command, timeout=timeout)

            exit_code = stdout.channel.recv_exit_status()
            stdout_text = stdout.read().decode("utf-8", errors="replace")
            stderr_text = stderr.read().decode("utf-8", errors="replace")

            execution_time = time.time() - start_time

            return stdout_text, stderr_text, exit_code, execution_time

        except paramiko.SSHException as e:
            raise SSHCommandException(f"Command execution failed: {str(e)}", e)
        except Exception as e:
            raise SSHCommandException(f"Unexpected error: {str(e)}", e)

    def is_connected(self) -> bool:
        """Check if SSH connection is alive"""
        if self._client is None:
            return False
        try:
            transport = self._client.get_transport()
            if transport is None:
                return False
            transport.send_ignore()
            return True
        except Exception:
            return False

    def close(self):
        """Close SSH connection"""
        if self._client:
            self._client.close()
            self._client = None
            logger.info("SSH connection closed")


ssh_service = SSHService()
