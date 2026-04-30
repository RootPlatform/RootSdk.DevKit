import React from "react";
import { moderationServiceClient } from "@moderation/gen-client";
import { GetSettingsResponse } from "@moderation/gen-shared";
import { FormRow, Toggle, styles } from "../Settings";
import { useFieldAutoSave, FieldAutoSaveStatus } from "./fieldAutoSave";
import { Panel } from "../../components/Panel";
import { MasterSubToggleGroup } from "../../components/MasterSubToggleGroup";

interface Props {
  data: GetSettingsResponse;
  onSaved: () => void;
}

export const RateLimitTab: React.FC<Props> = ({ data, onSaved }) => {
  const stored = data.rateLimit!;
  const limits = data.limits!;

  const enabled = useFieldAutoSave(stored.enabled, async (v) => {
    await moderationServiceClient.setRateLimitEnabled({ enabled: v });
    onSaved();
  });
  const max = useFieldAutoSave(stored.maxMessages, async (v) => {
    await moderationServiceClient.setRateLimitMax({ maxMessages: v });
    onSaved();
  });
  const win = useFieldAutoSave(stored.windowSeconds, async (v) => {
    await moderationServiceClient.setRateLimitWindow({ windowSeconds: v });
    onSaved();
  });

  return (
    <Panel
      title="Rate limiting"
      description="Cap how many messages a user can send in a sliding window."
    >
      <MasterSubToggleGroup
        enabled={enabled.value}
        master={
          <>
            <FormRow
              label="Enable rate limiting"
              description="When enabled, messages over the limit are deleted automatically."
            >
              <Toggle checked={enabled.value} onChange={enabled.setValue} />
            </FormRow>
            <FieldAutoSaveStatus state={enabled} />
          </>
        }
      >
        <FormRow
          label="Max messages"
          description="Maximum messages allowed within the window."
        >
          <input
            type="number"
            className={`${styles.input} ${styles.numberInput}`}
            value={max.value}
            min={limits.rateLimitMaxMessagesMin}
            max={limits.rateLimitMaxMessagesMax}
            onChange={(e) => max.setValue(Number(e.target.value) || 0)}
          />
          <span className={styles.help}>
            {limits.rateLimitMaxMessagesMin}–{limits.rateLimitMaxMessagesMax}
          </span>
        </FormRow>
        <FieldAutoSaveStatus state={max} />

        <FormRow label="Window" description="Sliding window duration.">
          <input
            type="number"
            className={`${styles.input} ${styles.numberInput}`}
            value={win.value}
            min={limits.rateLimitWindowSecondsMin}
            max={limits.rateLimitWindowSecondsMax}
            onChange={(e) => win.setValue(Number(e.target.value) || 0)}
          />
          <span className={styles.help}>
            seconds ({limits.rateLimitWindowSecondsMin}–
            {limits.rateLimitWindowSecondsMax})
          </span>
        </FormRow>
        <FieldAutoSaveStatus state={win} />
      </MasterSubToggleGroup>
    </Panel>
  );
};
