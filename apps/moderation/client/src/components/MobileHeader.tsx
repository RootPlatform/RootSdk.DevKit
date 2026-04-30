import React, { useRef, useState } from "react";
import { Menu, Shield, X } from "lucide-react";
import styles from "./MobileHeader.module.css";
import { IconBox } from "./IconBox";
import { ModerationTab, NavItem, visibleNavItems } from "./navItems";
import { useFocusTrap } from "../lib/useFocusTrap";

interface Props {
  tab: ModerationTab;
  setTab: (tab: ModerationTab) => void;
  amIAdmin: boolean;
}

// MobileHeader — top bar + slide-in drawer for viewports below 960px.
// Identity card on the left, hamburger toggle on the right. Drawer is a
// fixed overlay; useFocusTrap manages focus + body-scroll lock + Escape
// handling while open.
export const MobileHeader: React.FC<Props> = ({ tab, setTab, amIAdmin }) => {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const items = visibleNavItems(amIAdmin);

  useFocusTrap({
    active: open,
    containerRef: drawerRef,
    onEscape: () => setOpen(false),
  });

  const select = (next: ModerationTab) => {
    setTab(next);
    setOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <div className={styles.identity}>
          <IconBox accent="brand" size={32}>
            <Shield size={16} />
          </IconBox>
          <div className={styles.identityText}>
            <h1 className={styles.identityTitle}>Moderation</h1>
            <p className={styles.identitySubtitle}>Root App</p>
          </div>
        </div>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
        >
          <Menu size={20} />
        </button>
      </div>

      <div
        className={`${styles.scrim} ${open ? styles.scrimOpen : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />
      <div
        ref={drawerRef}
        className={`${styles.drawer} ${open ? styles.drawerOpen : ""}`}
        role="navigation"
        aria-label="Primary"
        aria-hidden={!open}
      >
        <div className={styles.drawerHeader}>
          <div className={styles.identity}>
            <IconBox accent="brand" size={32}>
              <Shield size={16} />
            </IconBox>
            <div className={styles.identityText}>
              <h1 className={styles.identityTitle}>Moderation</h1>
              <p className={styles.identitySubtitle}>Root App</p>
            </div>
          </div>
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <nav className={styles.drawerNav}>
          {items.map((item) => (
            <DrawerItem
              key={item.key}
              item={item}
              active={tab === item.key}
              onClick={() => select(item.key)}
            />
          ))}
        </nav>
      </div>
    </header>
  );
};

const DrawerItem: React.FC<{
  item: NavItem;
  active: boolean;
  onClick: () => void;
}> = ({ item, active, onClick }) => {
  const ItemIcon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.drawerItem} ${active ? styles.drawerItemActive : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <span className={styles.drawerIcon}>
        <ItemIcon size={18} />
      </span>
      <span>{item.label}</span>
    </button>
  );
};
