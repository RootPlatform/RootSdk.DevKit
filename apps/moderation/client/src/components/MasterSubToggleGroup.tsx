import React from "react";
import styles from "./MasterSubToggleGroup.module.css";

interface Props {
  // The master row (typically a FormRow + Toggle). Always rendered.
  master: React.ReactNode;
  // The dependent sub-rows. Only rendered when `enabled` is true.
  children: React.ReactNode;
  enabled: boolean;
}

// MasterSubToggleGroup — visual primitive for the "master toggle controls
// dependent sub-toggles" pattern. The sub-toggles container is indented
// and visually connected to the master via a 2px left border, so it's
// obvious they're scoped under the master. When the master is off, the
// sub-rows don't render — they're not just disabled, because seeing a
// stack of greyed-out controls below an off master is more cluttered
// than the cleaner "off → no children" state.
//
// State is owned by the parent: pass `enabled={someBool}` and the parent
// also wires the master's toggle state.
export const MasterSubToggleGroup: React.FC<Props> = ({
  master,
  children,
  enabled,
}) => {
  return (
    <div className={styles.group}>
      {master}
      {enabled && <div className={styles.children}>{children}</div>}
    </div>
  );
};
