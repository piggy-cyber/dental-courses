const demoStudents = [
  { id: "maya", name: "Maya Chen", email: "maya.chen@case.edu", identity: "Google", status: "approved", requested: ["d1"], access: ["d1"] },
  { id: "sam", name: "Sam Patel", email: "sam.patel@gmail.com", identity: "Google", status: "pending", requested: ["d1"], access: [] },
  { id: "jordan", name: "Jordan Lee", email: "jordan.lee@gmail.com", identity: "Google", status: "pending", requested: ["d1", "d2"], access: [] },
  { id: "alex", name: "Alex Rivera", email: "alex.rivera@gmail.com", identity: "Google", status: "hold", requested: ["d2"], access: [] }
];

const savedStudents = JSON.parse(localStorage.getItem("d1-demo-students") || "null");
const students = (Array.isArray(savedStudents) ? savedStudents : demoStudents).map(normalizeStudent);
const approvalList = document.querySelector("#approval-list");
const ownerSummary = document.querySelector("#owner-summary");
const ownerStatus = document.querySelector("#owner-status");
const exportAccessQueue = document.querySelector("#export-access-queue");

function normalizeStudent(student) {
  const requested = Array.isArray(student.requested)
    ? student.requested
    : String(student.requested || "D1 full library").toLowerCase().includes("d2")
      ? ["d2"]
      : ["d1"];
  const access = Array.isArray(student.access)
    ? student.access
    : student.status === "approved"
      ? ["d1"]
      : [];
  return {
    ...student,
    identity: student.identity || "Google",
    requested,
    access
  };
}

function saveStudents() {
  localStorage.setItem("d1-demo-students", JSON.stringify(students));
}

function cohortLabel(cohort) {
  return cohort.toUpperCase();
}

function cohortPills(cohorts, emptyLabel = "No access") {
  if (!cohorts.length) return `<span class="access-chip is-empty">${emptyLabel}</span>`;
  return cohorts.map((cohort) => `<span class="access-chip">${cohortLabel(cohort)}</span>`).join("");
}

function statusText(student) {
  if (student.status === "approved") return "Access granted";
  if (student.status === "revoked") return "Access revoked";
  if (student.status === "hold") return "Held for review";
  return "Ready for master approval";
}

function renderSummary() {
  const approved = students.filter((student) => student.status === "approved").length;
  const d1 = students.filter((student) => student.access.includes("d1")).length;
  const d2 = students.filter((student) => student.access.includes("d2")).length;
  const ready = students.filter((student) => student.status === "pending").length;
  ownerSummary.innerHTML = `
    <div><strong>${approved}</strong><span>approved</span></div>
    <div><strong>${d1}</strong><span>D1 access</span></div>
    <div><strong>${d2}</strong><span>D2 access</span></div>
    <div><strong>${ready}</strong><span>ready</span></div>
  `;
}

function renderList() {
  approvalList.innerHTML = students.map((student) => `
    <article class="approval-card">
      <div>
        <span class="status-dot ${student.status}"></span>
        <strong>${student.name}</strong>
        <small>${student.email}</small>
        <small>${student.identity} sign-in</small>
      </div>
      <div>
        <span>Requested</span>
        <div class="access-chip-row">${cohortPills(student.requested, "No request")}</div>
        <small>Master approval required</small>
      </div>
      <div>
        <strong>${statusText(student)}</strong>
        <div class="access-chip-row">${cohortPills(student.access)}</div>
      </div>
      <div class="approval-actions">
        <button type="button" data-action="approve-d1" data-id="${student.id}">Approve D1</button>
        <button type="button" data-action="approve-d2" data-id="${student.id}">Approve D2</button>
        <button type="button" data-action="approve-both" data-id="${student.id}">Approve both</button>
        <button type="button" data-action="hold" data-id="${student.id}">Hold</button>
        <button type="button" data-action="revoke" data-id="${student.id}">Revoke</button>
      </div>
    </article>
  `).join("");

  approvalList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const student = students.find((item) => item.id === button.dataset.id);
      if (!student) return;
      if (button.dataset.action === "approve-d1") grantAccess(student, ["d1"]);
      if (button.dataset.action === "approve-d2") grantAccess(student, ["d2"]);
      if (button.dataset.action === "approve-both") grantAccess(student, ["d1", "d2"]);
      if (button.dataset.action === "hold") student.status = "hold";
      if (button.dataset.action === "revoke") {
        student.status = "revoked";
        student.access = [];
      }
      saveStudents();
      renderSummary();
      renderList();
    });
  });
}

function grantAccess(student, cohorts) {
  student.access = Array.from(new Set([...student.access, ...cohorts]));
  student.status = "approved";
}

function exportQueue() {
  const payload = {
    exportedAt: new Date().toISOString(),
    product: "D1 Course Library",
    students
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "d1-course-library-access-queue.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  ownerStatus.textContent = "Queue export started.";
}

exportAccessQueue?.addEventListener("click", exportQueue);

renderSummary();
renderList();
