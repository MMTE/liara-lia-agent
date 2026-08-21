"use client";

export interface NavPage {
  route: string;
  title: string;
}

export interface NavGroup {
  id: string;
  label: string;
  pages: NavPage[];
}

interface DocsSidebarProps {
  nav: NavGroup[];
  currentRoute: string;
  onNavigate: (route: string) => void;
  onClose?: () => void;
}

export default function DocsSidebar({ nav, currentRoute, onNavigate, onClose }: DocsSidebarProps) {
  return (
    <nav aria-label="فهرست مستندات" className="h-full overflow-y-auto py-6 pe-4 ps-1">
      {onClose ? (
        <div className="mb-2 flex items-center justify-between px-3">
          <span className="text-[13px] font-semibold text-zinc-900">فهرست مستندات</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن فهرست"
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      ) : null}
      <ul className="space-y-6">
        {nav.map((group) => (
          <li key={group.id}>
            <p className="mb-2 px-2.5 text-[11.5px] font-semibold text-zinc-400">{group.label}</p>
            <ul className="space-y-0.5">
              {group.pages.map((item) => {
                const isActive = item.route === currentRoute;
                return (
                  <li key={item.route}>
                    <button
                      type="button"
                      onClick={() => onNavigate(item.route)}
                      aria-current={isActive ? "page" : undefined}
                      className={[
                        "w-full rounded-lg px-2.5 py-1.5 text-right text-[13px] leading-6 transition",
                        isActive
                          ? "bg-violet-50 font-medium text-violet-700"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                      ].join(" ")}
                    >
                      {item.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
