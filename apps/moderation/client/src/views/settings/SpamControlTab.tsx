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

  const gate = data.newMemberGate;
  const gateEnabled = useFieldAutoSave(
    gate?.enabled ?? false,
    async (v) => {
      await moderationServiceClient.setNewMemberGateEnabled({ enabled: v });
      onSaved();
    },
  );
  const gateMinMinutes = useFieldAutoSave(
    gate?.minMinutes ?? 5,
    async (v) => {
      await moderationServiceClient.setNewMemberGateMinMinutes({
        minMinutes: v,
      });
      onSaved();
    },
  );
  const gateWarn = useFieldAutoSave(
    gate?.warnUsers ?? false,
    async (v) => {
      await moderationServiceClient.setNewMemberGateWarnUsers({ enabled: v });
      onSaved();
    },
  );

  const mention = data.mentionSpam;
  const mentionEnabled = useFieldAutoSave(
    mention?.enabled ?? false,
    async (v) => {
      await moderationServiceClient.setMentionSpamEnabled({ enabled: v });
      onSaved();
    },
  );
  const mentionMax = useFieldAutoSave(
    mention?.maxMentionsPerMessage ?? 10,
    async (v) => {
      await moderationServiceClient.setMentionSpamMaxMentions({
        maxMentions: v,
      });
      onSaved();
    },
  );
  const mentionWarn = useFieldAutoSave(
    mention?.warnUsers ?? false,
    async (v) => {
      await moderationServiceClient.setMentionSpamWarnUsers({ enabled: v });
      onSaved();
    },
  );

  return (
    <>
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

    {/* New member gate — separate Panel since it's a distinct rule
        (gates new members rather than detecting repeat content). Lives
        under Spam Control because the motivating use case is drive-by
        spam from just-joined accounts. */}
    <Panel
      title="New member gate"
      description="Block messages from members who joined too recently. Effective against drive-by spam without explicit content matching."
    >
      <MasterSubToggleGroup
        enabled={gateEnabled.value}
        master={
          <>
            <FormRow
              label="Enable new member gate"
              description="When enabled, messages from members who joined less than the threshold below are deleted automatically."
            >
              <Toggle
                checked={gateEnabled.value}
                onChange={gateEnabled.setValue}
              />
            </FormRow>
            <FieldAutoSaveStatus state={gateEnabled} />
          </>
        }
      >
        <FormRow
          label="Minimum tenure"
          description="How long a member must have been in the community before they can post."
        >
          <input
            type="number"
            className={`${styles.input} ${styles.numberInput}`}
            value={gateMinMinutes.value}
            min={limits.newMemberGateMinMinutesMin}
            max={limits.newMemberGateMinMinutesMax}
            onChange={(e) =>
              gateMinMinutes.setValue(Number(e.target.value) || 0)
            }
            aria-label="Minimum tenure in minutes before posting"
          />
          <span className={styles.help}>
            minutes ({limits.newMemberGateMinMinutesMin}–
            {limits.newMemberGateMinMinutesMax})
          </span>
        </FormRow>
        <FieldAutoSaveStatus state={gateMinMinutes} />

        <FormRow
          label="Warn users"
          description="Send a public message in the channel when a too-new member is gated."
        >
          <Toggle
            checked={gateWarn.value}
            onChange={gateWarn.setValue}
          />
        </FormRow>
        <FieldAutoSaveStatus state={gateWarn} />
      </MasterSubToggleGroup>
    </Panel>

    {/* Mention spam — caps user+role mentions per message. Stateless
        (each message judged independently), so it ships under Spam
        Control alongside the duplicate-message detector and new-member
        gate as a "shape of message" rule rather than a "history of
        sender" rule. Counts come from referenceMaps, so unresolved
        markup doesn't trip it. */}
    <Panel
      title="Mention spam"
      description="Block messages that tag too many users or roles in one go. Catches @everyone-style pile-ons without rate-limit state."
    >
      <MasterSubToggleGroup
        enabled={mentionEnabled.value}
        master={
          <>
            <FormRow
              label="Enable mention spam rule"
              description="When enabled, messages with more mentions than the threshold below are deleted automatically."
            >
              <Toggle
                checked={mentionEnabled.value}
                onChange={mentionEnabled.setValue}
              />
            </FormRow>
            <FieldAutoSaveStatus state={mentionEnabled} />
          </>
        }
      >
        <FormRow
          label="Max mentions per message"
          description="Total user + role mentions allowed in a single message."
        >
          <input
            type="number"
            className={`${styles.input} ${styles.numberInput}`}
            value={mentionMax.value}
            min={limits.mentionSpamMaxMentionsMin}
            max={limits.mentionSpamMaxMentionsMax}
            onChange={(e) =>
              mentionMax.setValue(Number(e.target.value) || 0)
            }
            aria-label="Max mentions per message"
          />
          <span className={styles.help}>
            mentions ({limits.mentionSpamMaxMentionsMin}–
            {limits.mentionSpamMaxMentionsMax})
          </span>
        </FormRow>
        <FieldAutoSaveStatus state={mentionMax} />

        <FormRow
          label="Warn users"
          description="Send a public message in the channel when a mention-spam message is removed."
        >
          <Toggle
            checked={mentionWarn.value}
            onChange={mentionWarn.setValue}
          />
        </FormRow>
        <FieldAutoSaveStatus state={mentionWarn} />
      </MasterSubToggleGroup>
    </Panel>
    </>
  );
};
