const defaultStudents = [
  { id: "maya", name: "Maya Chen", email: "maya.chen@case.edu", identity: "Google", status: "approved", requested: ["d1"], access: ["d1"] },
  { id: "sam", name: "Sam Patel", email: "sam.patel@gmail.com", identity: "Google", status: "pending", requested: ["d1"], access: [] },
  { id: "jordan", name: "Jordan Lee", email: "jordan.lee@gmail.com", identity: "Google", status: "pending", requested: ["d1", "d2"], access: [] },
  { id: "alex", name: "Alex Rivera", email: "alex.rivera@gmail.com", identity: "Google", status: "hold", requested: ["d2"], access: [] }
];

const loginForm = document.querySelector("#student-login-form");
const requestForm = document.querySelector("#student-request-form");
const loginStatus = document.querySelector("#login-status");
const requestStatus = document.querySelector("#request-status");
const accountState = document.querySelector("#account-state");
const demoApprovedAccount = document.querySelector("#demo-approved-account");
const googleDemoAccount = document.querySelector("#google-demo-account");

function loadStudents() {
  const saved = JSON.parse(localStorage.getItem("d1-demo-students") || "null");
  return (Array.isArray(saved) ? saved : defaultStudents.slice()).map(normalizeStudent);
}

function saveStudents(students) {
  localStorage.setItem("d1-demo-students", JSON.stringify(students));
}

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

function groupLabel(student) {
  return student.access.length ? student.access.map((group) => group.toUpperCase()).join(" + ") : "No full-library access";
}

function activeStudent() {
  const email = localStorage.getItem("d1-active-student") || "";
  return loadStudents().find((student) => student.email.toLowerCase() === email.toLowerCase()) || null;
}

function accountAccessLabel(student) {
  if (student.status === "approved") return "Approved library access";
  if (student.status === "revoked") return "Access paused";
  if (student.status === "pending") return "Awaiting master approval";
  return "Request received";
}

function accountAccessHelp(student) {
  if (student.status === "revoked") return "The free sample remains open while the owner reviews your account.";
  if (student.status === "pending") return "Full library access opens once the master account approves your request.";
  return "The free sample remains open while your account request is reviewed.";
}

function renderAccountState() {
  const student = activeStudent();
  if (student?.status === "approved") {
    accountState.innerHTML = `
      <div>
        <span>Signed in</span>
        <strong>${student.name}</strong>
        <small>${groupLabel(student)} approved</small>
      </div>
      <div class="account-state-actions">
        <a class="button primary" href="library.html">Open library</a>
        <a class="button secondary" href="course.html?course=HWDP%20131">Open course hub</a>
        <button class="button secondary" type="button" data-action="sign-out">Sign out</button>
      </div>
    `;
    accountState.querySelector("[data-action='sign-out']").addEventListener("click", () => {
      localStorage.removeItem("d1-access-mode");
      localStorage.removeItem("d1-active-student");
      localStorage.removeItem("d1-access-groups");
      renderAccountState();
      loginStatus.textContent = "Signed out.";
    });
    return;
  }

  if (student) {
    accountState.innerHTML = `
      <div>
        <span>${accountAccessLabel(student)}</span>
        <strong>${student.name}</strong>
        <small>${accountAccessHelp(student)}</small>
      </div>
      <div class="account-state-actions">
        <a class="button secondary" href="course.html?course=HEWB%20121&demo=sample">Open free sample</a>
        <button class="button secondary" type="button" data-action="sign-out">Sign out</button>
      </div>
    `;
    accountState.querySelector("[data-action='sign-out']").addEventListener("click", () => {
      localStorage.removeItem("d1-access-mode");
      localStorage.removeItem("d1-active-student");
      localStorage.removeItem("d1-access-groups");
      renderAccountState();
      loginStatus.textContent = "Signed out.";
    });
    return;
  }

  accountState.innerHTML = `
    <div>
      <span>Preview access</span>
      <strong>FLS is open as the free sample.</strong>
      <small>Full library access opens after account approval.</small>
    </div>
  `;
}

function studentId(email) {
  return String(email || "")
    .toLowerCase()
    .replace(/@.*/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `student-${Date.now()}`;
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.querySelector("#student-email").value.trim().toLowerCase();
  const students = loadStudents();
  const student = students.find((item) => item.email.toLowerCase() === email);

  if (student?.status === "approved") {
    localStorage.setItem("d1-access-mode", "student");
    localStorage.setItem("d1-active-student", student.email);
    localStorage.setItem("d1-access-groups", JSON.stringify(student.access));
    window.location.href = "course.html?course=HWDP%20131&demo=student";
    return;
  }

  if (student) {
    localStorage.removeItem("d1-access-mode");
    localStorage.removeItem("d1-access-groups");
    localStorage.setItem("d1-active-student", student.email);
    renderAccountState();
    loginStatus.textContent = "Your account request is being reviewed. Access opens after approval.";
    return;
  }

  loginStatus.textContent = "No approved account found yet. Request access below.";
});

requestForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#request-name").value.trim();
  const email = document.querySelector("#request-email").value.trim().toLowerCase();

  if (!name || !email) {
    requestStatus.textContent = "Add your name and school email to request access.";
    return;
  }

  const students = loadStudents();
  const existing = students.find((item) => item.email.toLowerCase() === email);

  if (existing) {
    existing.name = name;
    existing.status = existing.status === "approved" ? "approved" : "hold";
    localStorage.setItem("d1-active-student", existing.email);
    requestStatus.textContent = existing.status === "approved"
      ? "Your account is already approved. Sign in above."
      : "Your request is already in the access queue.";
  } else {
    students.push({
      id: studentId(email),
      name,
      email,
      identity: "Google",
      status: "pending",
      requested: ["d1"],
      access: []
    });
    localStorage.setItem("d1-active-student", email);
    requestStatus.textContent = "Request received. You will get access after approval.";
  }

  saveStudents(students);
  renderAccountState();
});

demoApprovedAccount.addEventListener("click", () => {
  document.querySelector("#student-email").value = "maya.chen@case.edu";
  document.querySelector("#student-password").value = "preview";
  loginStatus.textContent = "Approved example filled. Sign in to preview full access.";
});

googleDemoAccount.addEventListener("click", () => {
  localStorage.setItem("d1-access-mode", "student");
  localStorage.setItem("d1-active-student", "maya.chen@case.edu");
  localStorage.setItem("d1-access-groups", JSON.stringify(["d1"]));
  window.location.href = "course.html?course=HWDP%20131&demo=student";
});

renderAccountState();
