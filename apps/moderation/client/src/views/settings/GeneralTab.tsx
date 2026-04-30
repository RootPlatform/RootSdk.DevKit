import React from "react";
import { moderationServiceClient } from "@moderation/gen-client";
import { GetSettingsResponse } from "@moderation/gen-shared";
import { FormRow, styles } from "../Settings";
import { useFieldAutoSave, FieldAutoSaveStatus } from "./fieldAutoSave";
import { Panel } from "../../components/Panel";

interface Props {
  data: GetSettingsResponse;
  onSaved: () => void;
}

export const GeneralTab: React.FC<Props> = ({ data, onSaved }) => {
  const stored = data.general!;
  const limits = data.limits!;

  const retention = useFieldAutoSave(stored.retentionDays, async (v) => {
    await moderationServiceClient.setRetentionDays({ days: v });
    onSaved();
  });

  return (
    <Panel
      title="General"
      description="Retention and other app-wide settings."
    >
      <FormRow
        label="Analytics retention"
        description="Audit log entries older than this are deleted automatically during daily cleanup."
      >
        <input
          type="number"
          className={`${styles.input} ${styles.numberInput}`}
          value={retention.value}
          min={limits.retentionDaysMin}
          max={limits.retentionDaysMax}
          onChange={(e) => retention.setValue(Number(e.target.value) || 0)}
        />
        <span className={styles.help}>
          {limits.retentionDaysMin}–{limits.retentionDaysMax} days
        </span>
      </FormRow>
      <FieldAutoSaveStatus state={retention} />
    </Panel>
  );
};
