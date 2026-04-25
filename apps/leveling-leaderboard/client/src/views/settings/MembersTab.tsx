import React, { useEffect, useState } from "react";
import { leaderboardServiceClient } from "@levelingleaderboard/gen-client";
import type { XpEligibleMembers } from "@levelingleaderboard/gen-shared";
import styles from "./MembersTab.module.css";
import { RootUserRoleSelector } from "../../components/RootUserRoleSelector";
import { AutoSaveStatus } from "../../components/AutoSaveStatus";
import { useDebouncedMutation } from "../../lib/useDebouncedMutation";
import { isPersonId } from "../../lib/guid";
import { withClientRetry } from "../../lib/retry";

// ============================================================================
// MembersTab — picker for the XP-eligible roles and members.
//
// Server-side selection is backed by a MemberGroup (see
// server/src/xpEligibleGroup.ts). The platform resolves role membership into
// a flat user set for the message-handler check; we just push selected role
// IDs and user IDs.
//
// Empty semantics: if no users and no roles are selected, the server treats
// everyone as eligible (DESIGN.md Appendix → Eligible members). We surface
// this in the tab copy so admins aren't confused by an "empty = permissive"
// rule.
//
// App filtering: RootUserRoleSelector includes apps in its list. We
// post-filter `selectedUserIds` through isPersonId before saving, and drop
// the picker's current app selection with a one-shot inline hint. Server
// also rejects non-Person IDs as defence in depth.
// ============================================================================

interface Props {
  initial: XpEligibleMembers;
  onSaved: (next: XpEligibleMembers) => void;
}

export const MembersTab: React.FC<Props> = ({ initial, onSaved }) => {
  const [userIds, setUserIds] = useState<string[]>(initial.userIds);
  const [roleIds, setRoleIds] = useState<string[]>(initial.communityRoleIds);
  const [pickerNote, setPickerNote] = useState<string | undefined>(undefined);

  // Re-sync if parent refetches (another admin saved, we just refreshed).
  const initialKey = `${[...initial.userIds].sort().join("|")}#${[...initial.communityRoleIds].sort().join("|")}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setUserIds(initial.userIds);
    setRoleIds(initial.communityRoleIds);
  }, [initialKey]);

  const save = useDebouncedMutation<XpEligibleMembers>({
    mutationFn: async (data) => {
      await withClientRetry(() =>
        leaderboardServiceClient.updateXpEligibleMembers({ members: data }),
      );
      onSaved(data);
    },
  });

  const onSelectionChange = (detail: {
    selectedUserIds: string[];
    selectedRoleIds: string[];
  }) => {
    // Filter apps out of the picker's user selection. If the admin clicked
    // an app row, this silently drops it and the hint explains why.
    const persons = detail.selectedUserIds.filter((id) => isPersonId(id));
    const droppedApps = detail.selectedUserIds.length - persons.length;
    if (droppedApps > 0) {
      setPickerNote("Apps don't earn XP and can't be added here.");
    } else {
      setPickerNote(undefined);
    }

    setUserIds(persons);
    setRoleIds(detail.selectedRoleIds);
    save.mutate({ userIds: persons, communityRoleIds: detail.selectedRoleIds });
  };

  const empty = userIds.length === 0 && roleIds.length === 0;

  return (
    <div className={styles.tab}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.heading}>XP-eligible members</h2>
          <p className={styles.help}>
            Pick roles or individual members who can earn XP. Leave everything
            unselected to let everyone earn.
          </p>
        </div>
        <AutoSaveStatus
          error={save.error}
          onRetry={save.retry}
          onDismissError={save.clearError}
        />
      </div>

      <div className={styles.pickerWrap}>
        <RootUserRoleSelector
          mode="multi"
          selectedUserIds={userIds}
          selectedRoleIds={roleIds}
          onSelectionChange={onSelectionChange}
        />
      </div>

      {pickerNote && (
        <p className={styles.note} role="status">
          {pickerNote}
        </p>
      )}

      {empty && (
        <p className={styles.emptyHint}>
          Nothing selected — everyone in the community is earning XP.
        </p>
      )}
    </div>
  );
};
