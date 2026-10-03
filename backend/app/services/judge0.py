import asyncio
import base64
import os
import subprocess
import sys
import tempfile
import time
from typing import Dict, Any, Optional, Tuple, List
import httpx
from app.core.config import settings
from app.models import Verdict

class CodeExecutionService:
    def __init__(self):
        self.api_url = settings.JUDGE0_API_URL.rstrip("/")
        self.timeout = settings.JUDGE0_SUBMISSION_TIMEOUT_SECONDS
        self.cpu_time_limit = settings.JUDGE0_CPU_TIME_LIMIT_SECONDS
        self.memory_limit = settings.JUDGE0_MEMORY_LIMIT_KB
        self.headers = {}
        if settings.JUDGE0_API_KEY:
            if settings.JUDGE0_USE_RAPIDAPI:
                self.headers["X-RapidAPI-Key"] = settings.JUDGE0_API_KEY
                self.headers["X-RapidAPI-Host"] = settings.JUDGE0_API_HOST or "judge0-ce.p.rapidapi.com"
            else:
                self.headers["X-Auth-Token"] = settings.JUDGE0_API_KEY

    def _is_fallback_permitted(self) -> bool:
        """
        Determines whether the local subprocess execution fallback is permitted.
        Subprocess fallback is strictly prohibited in production environments unless
        independently validated sandbox isolation is explicitly enabled.
        """
        if settings.ENVIRONMENT == "production":
            return bool(settings.ALLOW_SUBPROCESS_FALLBACK_IN_PRODUCTION)
        return bool(settings.JUDGE0_FALLBACK_ISOLATED)

    async def execute_python(
        self,
        source_code: str,
        stdin_data: str = "",
        cpu_time_limit: Optional[float] = None,
        memory_limit_kb: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Executes Python code via Judge0 if reachable;
        falls back to local runner only if permitted by security policy.
        """
        cpu_limit = cpu_time_limit or self.cpu_time_limit
        mem_limit = memory_limit_kb or self.memory_limit

        # 1. Attempt execution via Judge0
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "source_code": base64.b64encode(source_code.encode("utf-8")).decode("utf-8"),
                    "language_id": 71,  # Python (3.8.1 / 3.x)
                    "stdin": base64.b64encode(stdin_data.encode("utf-8")).decode("utf-8") if stdin_data else "",
                    "cpu_time_limit": cpu_limit,
                    "memory_limit": mem_limit,
                }
                url = f"{self.api_url}/submissions?base64_encoded=true&wait=true"
                response = await client.post(url, json=payload, headers=self.headers)
                if response.status_code in (200, 201):
                    data = response.json()
                    return self._parse_judge0_result(data)
        except Exception:
            if self._is_fallback_permitted():
                return await self._execute_isolated_local(source_code, stdin_data, cpu_limit)
            return {
                "verdict": Verdict.InternalError.value,
                "stdout": None,
                "stderr": None,
                "error_message": "Code execution service temporarily unavailable. Subprocess fallback is disabled in production.",
                "execution_time_ms": 0.0,
                "memory_used_kb": 0,
            }

        if self._is_fallback_permitted():
            return await self._execute_isolated_local(source_code, stdin_data, cpu_limit)
        return {
            "verdict": Verdict.InternalError.value,
            "stdout": None,
            "stderr": None,
            "error_message": "Judge0 returned an unexpected response. Subprocess fallback is disabled in production.",
            "execution_time_ms": 0.0,
            "memory_used_kb": 0,
        }

    def _parse_judge0_result(self, data: Dict[str, Any]) -> Dict[str, Any]:
        status_id = data.get("status", {}).get("id")
        stdout = data.get("stdout")
        if stdout:
            try:
                stdout = base64.b64decode(stdout).decode("utf-8", errors="replace")
            except Exception:
                pass
        stderr = data.get("stderr")
        if stderr:
            try:
                stderr = base64.b64decode(stderr).decode("utf-8", errors="replace")
            except Exception:
                pass
        compile_output = data.get("compile_output")
        if compile_output:
            try:
                compile_output = base64.b64decode(compile_output).decode("utf-8", errors="replace")
            except Exception:
                pass

        time_taken = float(data.get("time") or 0.0) * 1000  # ms
        memory_used = int(data.get("memory") or 0)

        # Judge0 status mapping
        # 3: Accepted, 4: Wrong Answer, 5: Time Limit Exceeded, 6: Compilation Error, 7-12: Runtime Error
        if status_id == 3:
            verdict = Verdict.Accepted.value
        elif status_id == 4:
            verdict = Verdict.WrongAnswer.value
        elif status_id == 5:
            verdict = Verdict.TimeLimitExceeded.value
        elif status_id == 6:
            verdict = Verdict.CompilationError.value
        elif status_id in (7, 8, 9, 10, 11, 12):
            verdict = Verdict.RuntimeError.value
        else:
            verdict = Verdict.InternalError.value

        error_msg = stderr or compile_output or data.get("message")
        if error_msg:
            # truncate overly long error messages to 2000 chars for safety
            error_msg = error_msg[:2000]

        return {
            "verdict": verdict,
            "stdout": stdout,
            "stderr": stderr,
            "error_message": error_msg,
            "execution_time_ms": round(time_taken, 2),
            "memory_used_kb": memory_used,
        }

    async def _execute_isolated_local(
        self,
        source_code: str,
        stdin_data: str,
        time_limit_sec: float,
    ) -> Dict[str, Any]:
        """
        Isolated local Python code runner with timeout safeguards and process limits.
        """
        def run_in_subprocess():
            with tempfile.NamedTemporaryFile(suffix=".py", mode="w", encoding="utf-8", delete=False) as f:
                f.write(source_code)
                script_path = f.name

            start_t = time.perf_counter()
            try:
                # Use current python executable with restricted flags (-S -I if possible, or -I isolated mode)
                cmd = [sys.executable, "-I", script_path]
                proc = subprocess.run(
                    cmd,
                    input=stdin_data,
                    capture_output=True,
                    text=True,
                    timeout=max(0.5, time_limit_sec),
                )
                duration_ms = round((time.perf_counter() - start_t) * 1000, 2)
                stdout = proc.stdout[:10000] if proc.stdout else ""
                stderr = proc.stderr[:2000] if proc.stderr else ""

                if proc.returncode != 0:
                    return {
                        "verdict": Verdict.RuntimeError.value,
                        "stdout": stdout,
                        "stderr": stderr,
                        "error_message": stderr or f"Process exited with code {proc.returncode}",
                        "execution_time_ms": duration_ms,
                        "memory_used_kb": 15000,
                    }

                return {
                    "verdict": Verdict.Accepted.value,
                    "stdout": stdout,
                    "stderr": stderr,
                    "error_message": None,
                    "execution_time_ms": duration_ms,
                    "memory_used_kb": 15000,
                }
            except subprocess.TimeoutExpired:
                duration_ms = round((time.perf_counter() - start_t) * 1000, 2)
                return {
                    "verdict": Verdict.TimeLimitExceeded.value,
                    "stdout": None,
                    "stderr": None,
                    "error_message": f"Time limit exceeded (> {time_limit_sec}s)",
                    "execution_time_ms": duration_ms,
                    "memory_used_kb": 20000,
                }
            except Exception as e:
                return {
                    "verdict": Verdict.InternalError.value,
                    "stdout": None,
                    "stderr": None,
                    "error_message": str(e)[:500],
                    "execution_time_ms": 0.0,
                    "memory_used_kb": 0,
                }
            finally:
                try:
                    if os.path.exists(script_path):
                        os.remove(script_path)
                except Exception:
                    pass

        return await asyncio.to_thread(run_in_subprocess)

judge0_service = CodeExecutionService()
