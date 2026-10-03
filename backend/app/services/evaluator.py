import asyncio
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import AsyncSessionLocal
from app.models import (
    Submission, SubmissionStatus, Verdict, Problem, TestCase, TestResult,
    ProblemProgress, AssignmentSubmission, AssignmentProblem, Notification
)
from app.services.judge0 import judge0_service

async def evaluate_submission_task(submission_id: int):
    """
    Background worker task to evaluate a Python submission against all test cases.
    """
    async with AsyncSessionLocal() as db:
        try:
            # 1. Fetch submission with problem and test cases
            stmt = (
                select(Submission)
                .options(
                    selectinload(Submission.problem).selectinload(Problem.test_cases)
                )
                .where(Submission.id == submission_id)
            )
            result = await db.execute(stmt)
            submission = result.scalar_one_or_none()
            if not submission:
                return

            submission.status = SubmissionStatus.PROCESSING.value
            await db.commit()

            problem = submission.problem
            test_cases = problem.test_cases
            if not test_cases:
                # No test cases defined
                submission.status = SubmissionStatus.COMPLETED.value
                submission.verdict = Verdict.Accepted.value
                submission.total_tests = 0
                submission.passed_tests = 0
                await db.commit()
                return

            total_tests = len(test_cases)
            passed_tests = 0
            max_time = 0.0
            max_memory = 0
            overall_verdict = Verdict.Accepted.value
            first_error_msg = None

            time_limit_sec = problem.time_limit_ms / 1000.0

            for tc in test_cases:
                run_res = await judge0_service.execute_python(
                    source_code=submission.source_code,
                    stdin_data=tc.input_data,
                    cpu_time_limit=time_limit_sec,
                    memory_limit_kb=problem.memory_limit_mb * 1024,
                )

                tc_verdict = run_res["verdict"]
                actual_out = (run_res["stdout"] or "").strip()
                expected_out = tc.expected_output.strip()
                exec_time = run_res.get("execution_time_ms") or 0.0
                mem_used = run_res.get("memory_used_kb") or 0

                max_time = max(max_time, exec_time)
                max_memory = max(max_memory, mem_used)

                passed = False
                if tc_verdict == Verdict.Accepted.value:
                    if actual_out == expected_out:
                        passed = True
                        tc_verdict = Verdict.Accepted.value
                    else:
                        tc_verdict = Verdict.WrongAnswer.value
                
                if passed:
                    passed_tests += 1
                elif overall_verdict == Verdict.Accepted.value:
                    # Capture first failing verdict
                    overall_verdict = tc_verdict
                    first_error_msg = run_res.get("error_message")

                # Create TestResult record
                # Never expose actual output or error details for hidden test cases
                test_result = TestResult(
                    submission_id=submission.id,
                    test_case_id=tc.id,
                    is_sample=tc.is_sample,
                    passed=passed,
                    verdict=tc_verdict,
                    execution_time_ms=exec_time,
                    actual_output=actual_out if tc.is_sample else None,
                    error_details=run_res.get("error_message") if tc.is_sample else None,
                )
                db.add(test_result)

            # Update submission
            submission.status = SubmissionStatus.COMPLETED.value
            submission.verdict = overall_verdict
            submission.execution_time_ms = round(max_time, 2)
            submission.memory_used_kb = max_memory
            submission.total_tests = total_tests
            submission.passed_tests = passed_tests
            submission.error_message = first_error_msg
            submission.updated_at = datetime.now(timezone.utc)

            # Update student ProblemProgress
            prog_stmt = select(ProblemProgress).where(
                ProblemProgress.user_id == submission.user_id,
                ProblemProgress.problem_id == problem.id,
            )
            prog_res = await db.execute(prog_stmt)
            progress = prog_res.scalar_one_or_none()
            if not progress:
                progress = ProblemProgress(
                    user_id=submission.user_id,
                    problem_id=problem.id,
                    status="SOLVED" if overall_verdict == Verdict.Accepted.value else "ATTEMPTED",
                    best_submission_id=submission.id,
                    attempts_count=1,
                    solved_at=datetime.now(timezone.utc) if overall_verdict == Verdict.Accepted.value else None,
                )
                db.add(progress)
            else:
                progress.attempts_count += 1
                if overall_verdict == Verdict.Accepted.value:
                    progress.status = "SOLVED"
                    if not progress.solved_at:
                        progress.solved_at = datetime.now(timezone.utc)
                    progress.best_submission_id = submission.id
                progress.updated_at = datetime.now(timezone.utc)

            # If Assignment submission, calculate score
            if submission.assignment_id:
                ap_stmt = select(AssignmentProblem).where(
                    AssignmentProblem.assignment_id == submission.assignment_id,
                    AssignmentProblem.problem_id == problem.id,
                )
                ap_res = await db.execute(ap_stmt)
                assign_prob = ap_res.scalar_one_or_none()
                points = assign_prob.points if assign_prob else 100
                score = round((passed_tests / total_tests) * points, 2) if total_tests > 0 else 0.0

                # Count previous attempts for this assignment and problem
                count_stmt = select(AssignmentSubmission).where(
                    AssignmentSubmission.assignment_id == submission.assignment_id,
                    AssignmentSubmission.student_id == submission.user_id,
                    AssignmentSubmission.problem_id == problem.id,
                )
                count_res = await db.execute(count_stmt)
                existing_subs = count_res.scalars().all()
                attempt_num = len(existing_subs) + 1

                assign_sub = AssignmentSubmission(
                    assignment_id=submission.assignment_id,
                    student_id=submission.user_id,
                    problem_id=problem.id,
                    submission_id=submission.id,
                    score=score,
                    attempt_number=attempt_num,
                )
                db.add(assign_sub)

            # In-app notification
            notif = Notification(
                user_id=submission.user_id,
                title=f"Submission Evaluated: {problem.title}",
                message=f"Verdict: {overall_verdict} ({passed_tests}/{total_tests} test cases passed).",
                type="submission",
            )
            db.add(notif)

            await db.commit()
        except Exception as e:
            await db.rollback()
            try:
                # Mark submission as failed
                async with AsyncSessionLocal() as fail_db:
                    f_stmt = select(Submission).where(Submission.id == submission_id)
                    f_res = await fail_db.execute(f_stmt)
                    f_sub = f_res.scalar_one_or_none()
                    if f_sub:
                        f_sub.status = SubmissionStatus.FAILED.value
                        f_sub.verdict = Verdict.InternalError.value
                        f_sub.error_message = f"Evaluation failure: {str(e)[:400]}"
                        await fail_db.commit()
            except Exception:
                pass
