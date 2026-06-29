import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const tabs = [
    { url: "/admin", label: "Overview" },
    { url: "/admin/tasks", label: "Tasks" },
    { url: "/admin/submissions", label: "Submissions" },
    { url: "/admin/users", label: "Users" },
    { url: "/admin/withdrawals", label: "Withdrawals" },
    { url: "/admin/referrals", label: "Referrals" },
    { url: "/admin/cms", label: "Site Content" },
  ];
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Admin</h1>
        <p className="text-muted-foreground text-sm">Manage the platform</p>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => {
          const active = pathname === t.url;
          return (
            <Link key={t.url} to={t.url as any} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
