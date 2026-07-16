import Link from "next/link";

type ActionLink = {
  href: string;
  label: string;
  detail: string;
  indicator: "teal" | "amber" | "blue";
  external?: boolean;
};

const STUDENT_ACTIONS: ActionLink[] = [
  {
    href: "/library",
    label: "Course Library",
    detail: "Search courses",
    indicator: "teal",
  },
  {
    href: "/games",
    label: "Study Games",
    detail: "Practice tooth ID",
    indicator: "blue",
  },
  {
    href: "/contacts",
    label: "Course Contacts",
    detail: "Class directory",
    indicator: "blue",
  },
  {
    href: "/grade-calculator",
    label: "Grade Calculator",
    detail: "Plan course grades",
    indicator: "blue",
  },
  {
    href: "https://cmms.serviceinsight.cbre.com/requests",
    label: "CBRE Maintenance",
    detail: "Building request",
    indicator: "amber",
    external: true,
  },
  {
    href: "https://cwru.teamdynamix.com/TDClient/126/Portal/Requests/TicketRequests/NewForm?ID=MYm8JKBW0yk_&RequestorType=ServiceOffering",
    label: "IT Support",
    detail: "TeamDynamix ticket",
    indicator: "amber",
    external: true,
  },
  {
    href: "/profile",
    label: "Profile",
    detail: "Account settings",
    indicator: "blue",
  },
];

const ADMIN_ACTIONS: ActionLink[] = [
  {
    href: "/admin",
    label: "Admin Portal",
    detail: "Control center",
    indicator: "teal",
  },
];

export function QuickActionsPanel({ isAdmin }: { isAdmin: boolean }) {
  const actions = isAdmin ? [...STUDENT_ACTIONS, ...ADMIN_ACTIONS] : STUDENT_ACTIONS;
  const desktopColumns = isAdmin ? "lg:grid-cols-8" : "lg:grid-cols-7";

  return (
    <div className="cockpit-panel">
      <div className="cockpit-section-bar">Quick Actions</div>
      <div className={`grid grid-cols-2 gap-px bg-brand-line sm:grid-cols-3 ${desktopColumns}`}>
        {actions.map((action) => {
          const indicatorClass =
            action.indicator === "amber"
              ? "cockpit-switch-indicator cockpit-switch-indicator-amber"
              : action.indicator === "blue"
                ? "cockpit-switch-indicator cockpit-switch-indicator-blue"
                : "cockpit-switch-indicator";

          const content = (
            <>
              <span className={indicatorClass} />
              <span className="flex flex-col text-left">
                <span className="text-xs font-bold text-brand-navy">{action.label}</span>
                <span className="text-[10px] text-brand-muted">{action.detail}</span>
              </span>
            </>
          );

          if (action.external) {
            return (
              <a
                key={action.href}
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                className="cockpit-switch flex-col items-start gap-1 bg-brand-panel sm:flex-row sm:items-center sm:gap-2"
              >
                {content}
              </a>
            );
          }

          return (
            <Link
              key={action.href}
              href={action.href}
              className="cockpit-switch flex-col items-start gap-1 bg-brand-panel sm:flex-row sm:items-center sm:gap-2"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
