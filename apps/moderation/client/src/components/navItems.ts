import {
  LayoutDashboard,
  List,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

// navItems — shared item definitions for Sidebar and MobileHeader so the
// two surfaces can never drift. Each item carries a lucide-react icon
// component reference; consuming components render `<item.icon size={n} />`.
//
// adminOnly is filtered by the consuming component using the AdminContext
// value; the structure here is purely declarative.

export type ModerationTab = "dashboard" | "audit" | "analytics" | "settings";

export interface NavItem {
  key: ModerationTab;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "audit", label: "Audit log", icon: List, adminOnly: true },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: Settings, adminOnly: true },
];

export function visibleNavItems(amIAdmin: boolean): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.adminOnly || amIAdmin);
}
