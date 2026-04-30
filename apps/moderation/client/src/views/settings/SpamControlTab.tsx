import React from "react";
import { moderationServiceClient } from "@moderation/gen-client";
import {
  GetSettingsResponse,
  SpamScope,
} from "@moderation/gen-shared";
import { FormRow, Toggle, styles } from "../Settings";
import { useFieldAutoSave, FieldAutoSaveStatus } from "./fieldAutoSave";
import { Panel } from "../../components/Panel";
import { MasterSubToggleGroup } from "../../components/MasterSubToggleGroup";
import { Select } from "../../components/Select";

interface Props {
  data: GetSettingsResponse;
  onSaved: () => void;
}

// SpamControlTab — master switch ("Enable spam detection") + indented
// thresholds, window, scope, warning. Same MasterSubToggleGroup primitive
// as ContentFilterTab.

export const SpamControlTab: React.FC<Props> = ({ data, onSaved }) => {
  const stored = data.spamControl!;
  const limits = data.limits!;

  const enabled = useFieldAutoSave(stored.enabled, async (v) => {
    await moderationServiceClient.setSpamEnabled({ enabled: v });
    onSaved();
  });
  const threshold = useFieldAutoSave(stored.threshold, async (v) => {
    await moderationServiceClient.setSpamThreshold({ threshold: v });
    onSaved();
  });
  const win = useFieldAutoSave(stored.windowMinutes, async (v) => {
    await moderationServiceClient.setSpamWindow({ windowMinutes: v });
    onSaved();
  });
  const scope = useFieldAutoSave<SpamScope>(stored.scope, async (v) => {
    await moderationServiceClient.setSpamScope({ scope: v });
    onSaved();
  });
  const warn = useFieldAutoSave(stored.warnUsers, async (v) => {
    await moderationServiceClient.setSpamWarnUsers({ enabled: v });
    onSaved();
  });

  return (
    <Panel
      title="Spam control"
      description="Detect and remove repeat-message spam from a single user."
    >
      <MasterSubToggleGroup
        enabled={enabled.value}
        master={
          <>
            <FormRow
              label="Enable spam detection"
              description="When enabled, repeat identical messages within the window are deleted automatically."
            >
              <Toggle checked={enabled.value} onChange={enabled.setValue} />
            </FormRow>
            <FieldAutoSaveStatus state={enabled} />
          </>
        }
      >
        <FormRow
          label="Threshold"
          description="How many identical messages from one user trigger the rule."
        >
          <input
            type="number"
            className={`${styles.input} ${styles.numberInput}`}
            value={threshold.value}
            min={limits.spamThresholdMin}
            max={limits.spamThresholdMax}
            onChange={(e) => threshold.setValue(Number(e.target.value) || 0)}
          />
          <span className={styles.help}>
            {limits.spamThresholdMin}–{limits.spamThresholdMax}
          </span>
        </FormRow>
        <FieldAutoSaveStatus state={threshold} />

        <FormRow
          label="Time window"
          description="How far back to look for duplicate messages."
        >
          <input
            type="number"
            className={`${styles.input} ${styles.numberInput}`}
            value={win.value}
            min={limits.spamWindowMinutesMin}
            max={limits.spamWindowMinutesMax}
            onChange={(e) => win.setValue(Number(e.target.value) || 0)}
          />
          <span className={styles.help}>
            minutes ({limits.spamWindowMinutesMin}–
            {limits.spamWindowMinutesMax})
          </span>
        </FormRow>
        <FieldAutoSaveStatus state={win} />

        <FormRow
          label="Detection scope"
          description="Whether duplicates are tracked per-channel or across the entire community."
        >
          <Select
            value={scope.value}
            onChange={(v) => scope.setValue(v)}
            options={[
              { value: SpamScope.PER_CHANNEL, label: "Per channel" },
              { value: SpamScope.SERVER_WIDE, label: "Server-wide" },
            ]}
          />
        </FormRow>
        <FieldAutoSaveStatus state={scope} />

        <FormRow
          label="Warn users"
          description="Send a public message in the channel when spam is detected."
        >
          <Toggle checked={warn.value} onChange={warn.setValue} />
        </FormRow>
        <FieldAutoSaveStatus state={warn} />
      </MasterSubToggleGroup>
    </Panel>
  );
};
