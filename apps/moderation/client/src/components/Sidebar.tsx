import React from "react";
import { Shield } from "lucide-react";
import styles from "./Sidebar.module.css";
import { IconBox } from "./IconBox";
import { ModerationTab, NavItem, visibleNavItems } from "./navItems";

interface Props {
  tab: ModerationTab;
  setTab: (tab: ModerationTab) => void;
  amIAdmin: boolean;
  version?: string;
}

// Sidebar — desktop-only static left column. The parent App grid collapses
// to a single column below 960px; this component renders nothing in that
// case (`display: none` in CSS). Mobile gets the MobileHeader instead.
//
// Identity card at top: Shield IconBox + "Moderation" + "Root App". Nav
// items below filter on amIAdmin (admin-only items hidden from non-admins).
// Footer carries an optional version label for ops.
export const Sidebar: React.FC<Props> = ({
  tab,
  setTab,
  amIAdmin,
  version,
}) => {
  const items = visibleNavItems(amIAdmin);
  return (
    <aside className={styles.sidebar} aria-label="Primary">
      <div className={styles.identity}>
        <IconBox accent="brand" size={40}>
          <Shield size={20} />
        </IconBox>
        <div className={styles.identityText}>
          <h1 className={styles.identityTitle}>Moderation</h1>
          <p className={styles.identitySubtitle}>Root App</p>
        </div>
      </div>
      <nav className={styles.nav}>
        {items.map((item) => (
          <SidebarItem
            key={item.key}
            item={item}
            active={tab === item.key}
            onClick={() => setTab(item.key)}
          />
        ))}
      </nav>
      {version && <div className={styles.footer}>v{version}</div>}
    </aside>
  );
};

const SidebarItem: React.FC<{
  item: NavItem;
  active: boolean;
  onClick: () => void;
}> = ({ item, active, onClick }) => {
  const ItemIcon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <span className={styles.navIcon}>
        <ItemIcon size={18} />
      </span>
      <span>{item.label}</span>
    </button>
  );
};
