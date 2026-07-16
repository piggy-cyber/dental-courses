import Link from "next/link";
import contactDirectoryData from "@/data/contact-directories.json";

export const dynamic = "force-dynamic";

type Directory = (typeof contactDirectoryData.directories)[number];
type Contact = Directory["contacts"][number];
type DirectorySearchParams = {
  directory?: string | string[];
};
type CourseContactsPageProps = {
  searchParams?: Promise<DirectorySearchParams>;
};

const directories = contactDirectoryData.directories as Directory[];
const defaultDirectory =
  directories.find((directory) => directory.status === "active") ?? directories[0];

const courseFamilyOrder = [
  "Biomedical Foundations",
  "Organ Systems",
  "Dental Sciences",
  "Leadership and Community",
] as const;

function selectedParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function directoryHref(directory: Directory) {
  return `/contacts?directory=${encodeURIComponent(directory.id)}`;
}

function valueOrDash(value: string) {
  return value.trim() ? value : "-";
}

function isPrimaryCourseContact(contact: Contact) {
  const role = contact.role.toLowerCase();
  if (role.includes("supporting")) return false;
  if (role.includes("ta") || role.includes("tutor")) return false;
  return role.includes("director") || role === "director";
}

function initials(name: string) {
  const cleaned = name
    .replace(/^Dr\.\s+/i, "")
    .replace(/^D[34]\s+/i, "")
    .split(",")[0]
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function courseFamily(courseCode: string) {
  if (courseCode.startsWith("HEWB")) return "Biomedical Foundations";
  if (courseCode.startsWith("HWDP")) return "Organ Systems";
  if (courseCode.startsWith("DSPR") || courseCode.startsWith("REHE")) return "Dental Sciences";
  return "Leadership and Community";
}

function statusClass(status: string) {
  if (
    status === "Viewing" ||
    status === "Current" ||
    status === "active" ||
    status === "Complete" ||
    status === "High"
  ) {
    return "border-brand-line bg-brand-soft text-brand-navy";
  }
  if (status === "Prepared" || status === "planned") {
    return "border-brand-line bg-brand-panel text-brand-muted";
  }
  if (status === "Needs review") {
    return "border-red-200 bg-red-50 text-red-800";
  }
  return "border-amber-300 bg-amber-50 text-amber-900";
}

function directoryStatusLabel(status: string) {
  if (status === "active") return "Current";
  if (status === "planned") return "Prepared";
  return status;
}

function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-flex border px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(value)}`}>
      {value}
    </span>
  );
}

function ContactEmail({ email }: { email: string }) {
  if (!email) return <span className="text-brand-muted">-</span>;

  return (
    <a className="portal-link font-semibold" href={`mailto:${email}`}>
      {email}
    </a>
  );
}

function DirectoryCard({ directory, selected }: { directory: Directory; selected: boolean }) {
  return (
    <Link
      href={directoryHref(directory)}
      aria-current={selected ? "page" : undefined}
      className="block hover:opacity-90"
    >
      <div
        className={`border px-4 py-3 ${
          selected
            ? "border-brand-blue bg-brand-panel"
            : "border-brand-line bg-brand-panel text-brand-muted"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-brand-navy">{directory.cohortLabel}</p>
            <p className="mt-1 text-xs leading-relaxed text-brand-muted">{directory.title}</p>
          </div>
          <span className="cockpit-gauge text-xs font-bold text-brand-muted">
            {directory.classYear === "TBD" ? "Pending" : directory.classYear}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <Badge value={selected ? "Viewing" : directoryStatusLabel(directory.status)} />
          <span className="text-[10px] font-semibold uppercase text-brand-muted">
            {directory.contacts.length} contacts
          </span>
        </div>
      </div>
    </Link>
  );
}

function ContactBlock({ contact, quiet = false }: { contact: Contact; quiet?: boolean }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-brand-line bg-brand-soft text-[11px] font-bold text-brand-navy">
        {initials(contact.person)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-snug text-brand-navy">{contact.person}</p>
        <p className="mt-0.5 text-xs leading-snug text-brand-muted">{contact.role}</p>
        <div className="mt-2 grid gap-1 text-xs leading-relaxed text-brand-muted">
          <p>
            <span className="font-semibold text-brand-ink">Email:</span>{" "}
            <ContactEmail email={contact.email} />
          </p>
          {(contact.phone || !quiet) && (
            <p>
              <span className="font-semibold text-brand-ink">Phone:</span>{" "}
              {valueOrDash(contact.phone)}
            </p>
          )}
          {(contact.office || contact.officeHours || !quiet) && (
            <p>
              <span className="font-semibold text-brand-ink">Office:</span>{" "}
              {valueOrDash(contact.office)}
              {contact.officeHours ? ` · ${contact.officeHours}` : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function CourseContactsPage({ searchParams }: CourseContactsPageProps) {
  const params = searchParams ? await searchParams : {};
  const selectedDirectoryId = selectedParam(params.directory);
  const activeDirectory =
    directories.find((directory) => directory.id === selectedDirectoryId) ?? defaultDirectory;
  const contacts = activeDirectory.contacts as Contact[];
  const auditRows = activeDirectory.audit;
  const courseContacts = contacts.filter((contact) => contact.courseCode !== "GLOBAL");
  const administrativeContacts = contacts.filter((contact) => contact.courseCode === "GLOBAL");
  const primaryContacts = courseContacts.filter(isPrimaryCourseContact);
  const supportingContacts = courseContacts.filter((contact) => !isPrimaryCourseContact(contact));
  const emailCount = contacts.filter((contact) => contact.email).length;
  const phoneCount = contacts.filter((contact) => contact.phone).length;
  const needsReviewCount = auditRows.filter((row) => row.status === "Needs review").length;
  const partialCoverageCount = auditRows.filter((row) => row.status === "Partial").length;
  const completeCoverageCount = auditRows.length - partialCoverageCount - needsReviewCount;

  const courseGroups = auditRows.map((audit) => {
    const groupContacts = courseContacts.filter((contact) => contact.courseCode === audit.courseCode);
    return {
      audit,
      primary: groupContacts.filter(isPrimaryCourseContact),
      supporting: groupContacts.filter((contact) => !isPrimaryCourseContact(contact)),
    };
  });

  const courseFamilies = courseFamilyOrder
    .map((label) => ({
      label,
      groups: courseGroups.filter(({ audit }) => courseFamily(audit.courseCode) === label),
    }))
    .filter((family) => family.groups.length > 0);

  return (
    <div className="space-y-8">
      <header className="border border-brand-line bg-brand-panel">
        <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-10">
          <div>
            <p className="eyebrow">{activeDirectory.cohortLabel}</p>
            <h1 className="portal-title mt-4 max-w-3xl text-5xl font-bold leading-[1.05] sm:text-6xl">
              {activeDirectory.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-brand-muted">
              A class-based contact sheet for the people students need first: course directors,
              co-directors, and the administrative contact that appears across syllabi.
            </p>
          </div>

          <aside>
            <p className="cockpit-readout-label">Class Directories</p>
            <div className="mt-3 space-y-3">
              {directories.map((directory) => (
                <DirectoryCard
                  key={directory.id}
                  directory={directory}
                  selected={directory.id === activeDirectory.id}
                />
              ))}
            </div>
          </aside>
        </div>

        <div className="grid border-t border-brand-line bg-brand-soft sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Courses", auditRows.length],
            ["Primary Contacts", primaryContacts.length],
            ["Direct Emails", emailCount],
            ["Needs Review", needsReviewCount],
          ].map(([label, value]) => (
            <div key={label} className="border-b border-r border-brand-line p-5 last:border-r-0 sm:border-b-0">
              <p className="cockpit-readout-label">{label}</p>
              <p className="cockpit-gauge-value mt-1 text-2xl">{value}</p>
            </div>
          ))}
        </div>
      </header>

      <section id={activeDirectory.id} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div>
            <p className="eyebrow">Contact Index</p>
            <h2 className="portal-title mt-1 text-3xl font-bold">Primary Contacts By Course</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-muted">
              Directors and co-directors are surfaced first. Supporting faculty and TAs stay
              preserved in the complete directory.
            </p>
          </div>

          {courseFamilies.length > 0 ? (
            <div className="space-y-6">
              {courseFamilies.map((family) => (
                <section key={family.label} className="space-y-3">
                  <div className="flex items-end justify-between gap-3 border-b border-brand-line pb-2">
                    <h3 className="text-sm font-bold uppercase text-brand-navy">{family.label}</h3>
                    <span className="cockpit-gauge text-xs text-brand-muted">
                      {family.groups.length} course{family.groups.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="grid gap-3 xl:grid-cols-2">
                    {family.groups.map(({ audit, primary, supporting }) => (
                      <article key={audit.courseCode} className="border border-brand-line bg-brand-panel">
                        <div className="border-b border-brand-line bg-brand-soft p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="cockpit-gauge text-xs font-bold text-brand-blue">{audit.courseCode}</p>
                              <h4 className="mt-1 font-bold leading-snug text-brand-navy">{audit.courseTitle}</h4>
                            </div>
                            <Badge value={audit.status} />
                          </div>
                        </div>
                        <div className="space-y-4 p-4">
                          {primary.length > 0 ? (
                            primary.map((contact) => (
                              <ContactBlock
                                key={`${contact.courseCode}-${contact.person}-${contact.role}`}
                                contact={contact}
                                quiet
                              />
                            ))
                          ) : (
                            <p className="text-sm text-brand-muted">No primary contact was listed for this course.</p>
                          )}
                          {supporting.length > 0 && (
                            <div className="border-t border-brand-line pt-3">
                              <p className="cockpit-readout-label">Also Listed</p>
                              <p className="mt-1 text-xs leading-relaxed text-brand-muted">
                                {supporting.map((contact) => contact.person).join("; ")}
                              </p>
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <section className="border border-brand-line bg-brand-panel p-6">
              <p className="eyebrow">Directory Ready</p>
              <h3 className="portal-title mt-2 text-2xl font-bold text-brand-navy">
                {activeDirectory.cohortLabel} is prepared for contact rows.
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-muted">
                This class directory exists in the same structure as the active directory. Contacts,
                coverage notes, and course grouping will appear here when that class list is added.
              </p>
              <div className="mt-6 grid gap-px bg-brand-line text-sm sm:grid-cols-3">
                {[
                  ["Class", activeDirectory.classYear === "TBD" ? "Pending" : activeDirectory.classYear],
                  ["Status", directoryStatusLabel(activeDirectory.status)],
                  ["Contacts", activeDirectory.contacts.length],
                ].map(([label, value]) => (
                  <div key={label} className="bg-brand-soft p-4">
                    <p className="cockpit-readout-label">{label}</p>
                    <p className="mt-1 font-bold text-brand-navy">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          {administrativeContacts.length > 0 && (
            <section className="border border-brand-line bg-brand-panel">
              <div className="cockpit-section-bar">Administrative Contact</div>
              <div className="space-y-4 p-4">
                {administrativeContacts.map((contact) => (
                  <div key={`${contact.courseCode}-${contact.person}`}>
                    <ContactBlock contact={contact} />
                    {contact.notes && (
                      <p className="mt-4 border-t border-brand-line pt-4 text-xs leading-relaxed text-brand-muted">
                        {contact.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="border border-brand-line bg-brand-panel p-4">
            <p className="cockpit-readout-label">Directory Status</p>
            <dl className="mt-4 grid grid-cols-3 gap-px bg-brand-line text-center">
              {[
                ["Complete", completeCoverageCount],
                ["Partial", partialCoverageCount],
                ["Review", needsReviewCount],
              ].map(([label, value]) => (
                <div key={label} className="bg-brand-panel p-3">
                  <dt className="text-[10px] font-bold uppercase text-brand-muted">{label}</dt>
                  <dd className="cockpit-gauge-value mt-1">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-brand-muted">
              {primaryContacts.length} primary contacts and {supportingContacts.length} supporting
              contacts are preserved. Blank fields are left blank instead of inferred.
            </p>
          </section>
        </aside>
      </section>

      {courseContacts.length > 0 && (
        <section className="border border-brand-line bg-brand-panel">
          <div className="cockpit-section-bar flex items-center justify-between">
            <span>Complete Directory</span>
            <span>
              {courseContacts.length} course row{courseContacts.length === 1 ? "" : "s"} · {phoneCount} phone rows
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="portal-table min-w-[1100px] text-xs">
              <thead>
                <tr>
                  <th className="w-40">Course</th>
                  <th className="w-64">Contact</th>
                  <th className="w-64">Direct Channel</th>
                  <th className="w-64">Location</th>
                  <th>Notes</th>
                  <th className="w-28">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {courseContacts.map((contact) => (
                  <tr key={`${contact.courseCode}-${contact.courseTitle}-${contact.person}-${contact.role}`}>
                    <td>
                      <p className="cockpit-gauge font-bold text-brand-navy">{contact.courseCode}</p>
                      <p className="mt-1 font-semibold leading-snug text-brand-ink">{contact.courseTitle}</p>
                    </td>
                    <td>
                      <p className="font-bold leading-snug text-brand-navy">{contact.person}</p>
                      <p className="mt-1 text-brand-muted">{contact.role}</p>
                    </td>
                    <td className="space-y-1">
                      <p>
                        <span className="font-semibold text-brand-ink">Email:</span>{" "}
                        <ContactEmail email={contact.email} />
                      </p>
                      <p>
                        <span className="font-semibold text-brand-ink">Phone:</span>{" "}
                        {valueOrDash(contact.phone)}
                      </p>
                    </td>
                    <td className="space-y-1">
                      <p>
                        <span className="font-semibold text-brand-ink">Office:</span>{" "}
                        {valueOrDash(contact.office)}
                      </p>
                      <p>
                        <span className="font-semibold text-brand-ink">Hours:</span>{" "}
                        {valueOrDash(contact.officeHours)}
                      </p>
                    </td>
                    <td className="leading-relaxed text-brand-muted">{valueOrDash(contact.notes)}</td>
                    <td>
                      <Badge value={contact.confidence} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {auditRows.length > 0 && (
        <details className="border border-brand-line bg-brand-panel">
          <summary className="cockpit-section-bar flex cursor-pointer list-none items-center justify-between">
            <span>Coverage Review</span>
            <span>
              {auditRows.length} course{auditRows.length === 1 ? "" : "s"}
            </span>
          </summary>
          <div className="overflow-x-auto">
            <table className="portal-table min-w-[860px] text-xs">
              <thead>
                <tr>
                  <th className="w-36">Course</th>
                  <th className="w-72">Course Title</th>
                  <th className="w-36">Status</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {auditRows.map((row) => (
                  <tr key={`${row.courseCode}-${row.courseTitle}`}>
                    <td className="cockpit-gauge font-bold text-brand-navy">{row.courseCode}</td>
                    <td className="font-semibold text-brand-ink">{row.courseTitle}</td>
                    <td>
                      <Badge value={row.status} />
                    </td>
                    <td className="leading-relaxed text-brand-muted">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
