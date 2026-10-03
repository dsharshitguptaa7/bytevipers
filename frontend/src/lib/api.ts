const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

class ApiClient {
  private getAuthHeader(): Record<string, string> {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("bytevipers_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...this.getAuthHeader(),
      ...(options.headers || {}),
    };

    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
      let errorMsg = `Error ${res.status}: ${res.statusText}`;
      try {
        const errorData = await res.json();
        errorMsg = errorData.detail || errorData.message || errorMsg;
      } catch {
        // use default error message
      }
      throw new Error(errorMsg);
    }

    // Return empty object for 204 or empty bodies
    if (res.status === 204) return {} as T;
    return res.json();
  }

  // --- Auth Endpoints ---
  async login(credentials: { username_or_email: string; password: string }) {
    return this.request<{ access_token: string; refresh_token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  async register(data: { email: string; username: string; full_name: string; password: string; gender: string }) {
    return this.request<any>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMe() {
    return this.request<any>("/auth/me");
  }

  async updateMe(data: { full_name?: string; password?: string }) {
    return this.request<any>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // --- Verification Endpoints ---
  async getMyVerification() {
    return this.request<any>("/verification/me");
  }

  async submitVerification(data: {
    full_name: string;
    institution_name: string;
    department: string;
    course: string;
    semester: string;
    roll_number: string;
    institutional_email?: string;
    verification_method?: string;
    document_reference?: string;
  }) {
    return this.request<any>("/verification/applications", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMyVerificationHistory() {
    return this.request<any[]>("/verification/history/me");
  }

  // --- Problems Endpoints ---
  async listProblems(params: { search?: string; difficulty?: string; tag?: string } = {}) {
    const q = new URLSearchParams();
    if (params.search) q.append("search", params.search);
    if (params.difficulty) q.append("difficulty", params.difficulty);
    if (params.tag) q.append("tag", params.tag);
    return this.request<any[]>(`/problems?${q.toString()}`);
  }

  async getProblem(slug: string) {
    return this.request<any>(`/problems/${slug}`);
  }

  async listTags() {
    return this.request<any[]>("/problems/tags/all");
  }

  // --- Code Execution & Submissions ---
  async runCode(data: { problem_id: number; source_code: string; custom_input?: string }) {
    return this.request<any>("/submissions/run", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async saveSubmissionDraft(data: { problem_id: number; language?: string; source_code: string }) {
    return this.request<any>("/submissions/draft", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getSubmissionDraft(problemId: number) {
    return this.request<any>(`/submissions/draft?problem_id=${problemId}`);
  }

  async submitCode(data: { problem_id: number; language?: string; source_code: string; assignment_id?: number }) {
    return this.request<any>("/submissions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getSubmission(id: number) {
    return this.request<any>(`/submissions/${id}`);
  }

  async getMySubmissionHistory(problemId?: number) {
    const q = problemId ? `?problem_id=${problemId}` : "";
    return this.request<any[]>(`/submissions/history/me${q}`);
  }

  // --- Student Dashboard & Classes & Assignments ---
  async getStudentDashboard() {
    return this.request<any>("/student/dashboard");
  }

  async getMyClasses() {
    return this.request<any[]>("/classes/my");
  }

  async enrollClass(code: string) {
    return this.request<any>("/classes/enroll", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  async getMyAssignments() {
    return this.request<any[]>("/assignments/my");
  }

  async getAssignmentDetail(id: number) {
    return this.request<any>(`/assignments/${id}`);
  }

  // --- Unified Teacher/Instructor Endpoints ---
  async getTeacherOverview() {
    return this.request<any>("/teacher/analytics/overview");
  }

  async listTeacherVerifications(params: { status_filter?: string; search?: string } = {}) {
    const q = new URLSearchParams();
    if (params.status_filter) q.append("status_filter", params.status_filter);
    if (params.search) q.append("search", params.search);
    return this.request<any[]>(`/teacher/verifications?${q.toString()}`);
  }

  async getTeacherVerification(id: number) {
    return this.request<any>(`/teacher/verifications/${id}`);
  }

  async approveVerification(id: number, notes?: string) {
    return this.request<any>(`/teacher/verifications/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ reviewer_notes: notes || "Approved" }),
    });
  }

  async rejectVerification(id: number, reason: string, notes?: string) {
    return this.request<any>(`/teacher/verifications/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason, reviewer_notes: notes }),
    });
  }

  async requestResubmission(id: number, reason: string, notes?: string) {
    return this.request<any>(`/teacher/verifications/${id}/request-resubmission`, {
      method: "POST",
      body: JSON.stringify({ reason, reviewer_notes: notes }),
    });
  }

  async listTeacherProblems(params: { status_filter?: string; search?: string; difficulty?: string } = {}) {
    const q = new URLSearchParams();
    if (params.status_filter) q.append("status_filter", params.status_filter);
    if (params.search) q.append("search", params.search);
    if (params.difficulty) q.append("difficulty", params.difficulty);
    return this.request<any[]>(`/teacher/problems?${q.toString()}`);
  }

  async getTeacherProblem(id: number) {
    return this.request<any>(`/teacher/problems/${id}`);
  }

  async createProblem(data: any) {
    return this.request<any>("/teacher/problems", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateProblem(id: number, data: any) {
    return this.request<any>(`/teacher/problems/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async toggleProblemPublish(id: number) {
    return this.request<any>(`/teacher/problems/${id}/publish`, {
      method: "POST",
    });
  }

  async deleteProblem(id: number) {
    return this.request<any>(`/teacher/problems/${id}`, {
      method: "DELETE",
    });
  }

  async listTeacherClasses() {
    return this.request<any[]>("/teacher/classes");
  }

  async getTeacherClass(id: number) {
    return this.request<any>(`/teacher/classes/${id}`);
  }

  async createClass(data: { name: string; description?: string }) {
    return this.request<any>("/teacher/classes", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async addStudentToClass(classId: number, studentEmail: string) {
    return this.request<any>(`/teacher/classes/${classId}/members?student_email=${encodeURIComponent(studentEmail)}`, {
      method: "POST",
    });
  }

  async removeStudentFromClass(classId: number, userId: number) {
    return this.request<any>(`/teacher/classes/${classId}/members/${userId}`, {
      method: "DELETE",
    });
  }

  async listTeacherAssignments(classId?: number) {
    const q = classId ? `?class_id=${classId}` : "";
    return this.request<any[]>(`/teacher/assignments${q}`);
  }

  async getTeacherAssignment(id: number) {
    return this.request<any>(`/teacher/assignments/${id}`);
  }

  async createAssignment(data: any) {
    return this.request<any>("/teacher/assignments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async toggleAssignmentPublish(id: number) {
    return this.request<any>(`/teacher/assignments/${id}/publish`, {
      method: "POST",
    });
  }

  async listTeacherSubmissions(params: {
    problem_id?: number;
    student_id?: number;
    status?: string;
    language?: string;
    search?: string;
  } = {}) {
    const q = new URLSearchParams();
    if (params.problem_id) q.append("problem_id", params.problem_id.toString());
    if (params.student_id) q.append("student_id", params.student_id.toString());
    if (params.status) q.append("status", params.status);
    if (params.language) q.append("language", params.language);
    if (params.search) q.append("search", params.search);
    return this.request<any[]>(`/teacher/submissions?${q.toString()}`);
  }

  async getTeacherSubmission(id: number) {
    return this.request<any>(`/teacher/submissions/${id}`);
  }

  async evaluateTeacherSubmission(id: number, data: { marks: number; teacher_feedback?: string; publish?: boolean }) {
    return this.request<any>(`/teacher/submissions/${id}/evaluate`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async publishTeacherSubmission(id: number) {
    return this.request<any>(`/teacher/submissions/${id}/publish`, {
      method: "PUT",
    });
  }

  // --- Student Online Tests ---
  async listAvailableTests() {
    return this.request<any[]>("/tests");
  }

  async getTestOverview(id: number) {
    return this.request<any>(`/tests/${id}`);
  }

  async startTestAttempt(id: number) {
    return this.request<any>(`/tests/${id}/start`, {
      method: "POST",
    });
  }

  async getActiveTestAttempt(id: number) {
    return this.request<any>(`/tests/${id}/attempt`);
  }

  async saveTestAnswers(
    attemptId: number,
    answers: Array<{
      question_id: number;
      selected_option?: string | null;
      text_response?: string | null;
      code_response?: string | null;
    }>
  ) {
    return this.request<any>(`/tests/attempts/${attemptId}/answers`, {
      method: "PUT",
      body: JSON.stringify({ answers }),
    });
  }

  async submitTestAttempt(attemptId: number) {
    return this.request<any>(`/tests/attempts/${attemptId}/submit`, {
      method: "POST",
    });
  }

  async getTestAttemptResult(attemptId: number) {
    return this.request<any>(`/tests/attempts/${attemptId}/result`);
  }

  async getMyTestResult(testId: number) {
    return this.request<any>(`/tests/${testId}/my-result`);
  }

  // --- Teacher Online Tests Management ---
  async listTeacherTests(params: { status_filter?: string; search?: string } = {}) {
    const q = new URLSearchParams();
    if (params.status_filter) q.append("status_filter", params.status_filter);
    if (params.search) q.append("search", params.search);
    return this.request<any[]>(`/teacher/tests?${q.toString()}`);
  }

  async getTeacherTest(id: number) {
    return this.request<any>(`/teacher/tests/${id}`);
  }

  async createTeacherTest(data: any) {
    return this.request<any>("/teacher/tests", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTeacherTest(id: number, data: any) {
    return this.request<any>(`/teacher/tests/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async publishTeacherTest(id: number) {
    return this.request<any>(`/teacher/tests/${id}/publish`, {
      method: "POST",
    });
  }

  async deleteTeacherTest(id: number) {
    return this.request<any>(`/teacher/tests/${id}`, {
      method: "DELETE",
    });
  }

  async addTestQuestion(testId: number, data: any) {
    return this.request<any>(`/teacher/tests/${testId}/questions`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTestQuestion(testId: number, questionId: number, data: any) {
    return this.request<any>(`/teacher/tests/${testId}/questions/${questionId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteTestQuestion(testId: number, questionId: number) {
    return this.request<any>(`/teacher/tests/${testId}/questions/${questionId}`, {
      method: "DELETE",
    });
  }

  async listTeacherTestAttempts(testId: number, params: { status?: string; search?: string } = {}) {
    const q = new URLSearchParams();
    if (params.status) q.append("status", params.status);
    if (params.search) q.append("search", params.search);
    return this.request<any[]>(`/teacher/tests/${testId}/attempts?${q.toString()}`);
  }

  async getTeacherTestAttempt(attemptId: number) {
    return this.request<any>(`/teacher/tests/attempts/${attemptId}`);
  }

  async evaluateTeacherTestAttempt(
    attemptId: number,
    data: {
      question_scores: Record<string, { marks: number; feedback?: string }>;
      overall_feedback?: string;
      publish?: boolean;
    }
  ) {
    return this.request<any>(`/teacher/tests/attempts/${attemptId}/evaluate`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async listPlatformUsers(params: { search?: string; role?: string; is_suspended?: boolean } = {}) {
    const q = new URLSearchParams();
    if (params.search) q.append("search", params.search);
    if (params.role) q.append("role", params.role);
    if (params.is_suspended !== undefined) q.append("is_suspended", String(params.is_suspended));
    return this.request<any[]>(`/teacher/platform/users?${q.toString()}`);
  }

  async updateTeacherPermissions(userId: number, permissions: string[]) {
    return this.request<any>(`/teacher/platform/users/${userId}/permissions`, {
      method: "PATCH",
      body: JSON.stringify({ permissions }),
    });
  }

  async setUserSuspension(userId: number, isSuspended: boolean, reason: string) {
    return this.request<any>(`/teacher/platform/users/${userId}/suspend`, {
      method: "PATCH",
      body: JSON.stringify({ is_suspended: isSuspended, reason }),
    });
  }

  async listAuditLogs(params: { action?: string; entity_type?: string } = {}) {
    const q = new URLSearchParams();
    if (params.action) q.append("action", params.action);
    if (params.entity_type) q.append("entity_type", params.entity_type);
    return this.request<any[]>(`/teacher/platform/audit-logs?${q.toString()}`);
  }

  // --- Coordinator Portal Endpoints ---
  async getCoordinatorStats() {
    return this.request<any>("/coordinator/stats");
  }

  async listCoordinatorVerifications(params: {
    status_filter?: string;
    my_assigned_only?: boolean;
    search?: string;
  } = {}) {
    const q = new URLSearchParams();
    if (params.status_filter) q.append("status_filter", params.status_filter);
    if (params.my_assigned_only) q.append("my_assigned_only", "true");
    if (params.search) q.append("search", params.search);
    return this.request<any[]>(`/coordinator/verifications?${q.toString()}`);
  }

  async getCoordinatorVerification(id: number) {
    return this.request<any>(`/coordinator/verifications/${id}`);
  }

  async coordinatorApproveVerification(id: number, reviewer_notes?: string) {
    return this.request<any>(`/coordinator/verifications/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ reviewer_notes }),
    });
  }

  async coordinatorRejectVerification(id: number, reason: string, reviewer_notes?: string) {
    return this.request<any>(`/coordinator/verifications/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason, reviewer_notes }),
    });
  }

  // --- Teacher Coordinator Management Endpoints ---
  async listCoordinatorPositions() {
    return this.request<any[]>("/teacher/coordinators");
  }

  async initializeCoordinator(data: {
    position: string;
    full_name: string;
    username: string;
    email: string;
    password: string;
  }) {
    return this.request<any[]>("/teacher/coordinators/initialize", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCoordinator(userId: number, data: {
    full_name?: string;
    username?: string;
    email?: string;
    is_active?: boolean;
  }) {
    return this.request<any[]>(`/teacher/coordinators/${userId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async resetCoordinatorPassword(userId: number, new_password: string) {
    return this.request<any>(`/teacher/coordinators/${userId}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ new_password }),
    });
  }

  async reassignVerification(verificationId: number, coordinatorId: number, reason?: string) {
    return this.request<any>(`/teacher/verifications/${verificationId}/reassign`, {
      method: "POST",
      body: JSON.stringify({ coordinator_id: coordinatorId, reason }),
    });
  }

  async listVerificationAuditHistory(params: {
    student_id?: number;
    coordinator_id?: number;
    action?: string;
  } = {}) {
    const q = new URLSearchParams();
    if (params.student_id) q.append("student_id", params.student_id.toString());
    if (params.coordinator_id) q.append("coordinator_id", params.coordinator_id.toString());
    if (params.action) q.append("action", params.action);
    return this.request<any[]>(`/teacher/verifications/audit-history?${q.toString()}`);
  }
}

export const api = new ApiClient();
