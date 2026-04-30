import React from "react";
import { moderationServiceClient } from "@moderation/gen-client";
import {
  GetSettingsResponse,
  WordCategory,
} from "@moderation/gen-shared";
import { FormRow, Toggle } from "../Settings";
import { useFieldAutoSave, FieldAutoSaveStatus } from "./fieldAutoSave";
import { WordListPanel } from "./WordListPanel";
import { Panel } from "../../components/Panel";
import { MasterSubToggleGroup } from "../../components/MasterSubToggleGroup";

interface Props {
  data: GetSettingsResponse;
  onSaved: () => void;
}

// ContentFilterTab — master switch ("Enable content filter") with four
// indented sub-toggles. The MasterSubToggleGroup primitive renders the
// indented children container with the left-border connector when
// `enabled` is true, hides them when off. Word lists below are scoped to
// this tab since they're feature-specific config.

export const ContentFilterTab: React.FC<Props> = ({ data, onSaved }) => {
  const stored = data.contentFilter!;

  const enabled = useFieldAutoSave(stored.enabled, async (v) => {
    await moderationServiceClient.setContentFilterEnabled({ enabled: v });
    onSaved();
  });
  const slurs = useFieldAutoSave(stored.filterSlurs, async (v) => {
    await moderationServiceClient.setFilterSlurs({ enabled: v });
    onSaved();
  });
  const profanity = useFieldAutoSave(stored.filterProfanity, async (v) => {
    await moderationServiceClient.setFilterProfanity({ enabled: v });
    onSaved();
  });
  const customWords = useFieldAutoSave(stored.filterCustomWords, async (v) => {
    await moderationServiceClient.setFilterCustomWords({ enabled: v });
    onSaved();
  });
  const warn = useFieldAutoSave(stored.warnUsers, async (v) => {
    await moderationServiceClient.setContentFilterWarnUsers({ enabled: v });
    onSaved();
  });

  return (
    <>
      <Panel
        title="Content filter"
        description="Automatically delete messages containing banned words."
      >
        <MasterSubToggleGroup
          enabled={enabled.value}
          master={
            <>
              <FormRow
                label="Enable content filter"
                description="When enabled, messages containing banned words are deleted automatically."
              >
                <Toggle checked={enabled.value} onChange={enabled.setValue} />
              </FormRow>
              <FieldAutoSaveStatus state={enabled} />
            </>
          }
        >
          <FormRow
            label="Filter slurs"
            description="Block the baseline slur list."
          >
            <Toggle checked={slurs.value} onChange={slurs.setValue} />
          </FormRow>
          <FieldAutoSaveStatus state={slurs} />

          <FormRow
            label="Filter profanity"
            description="Block the baseline profanity list."
          >
            <Toggle checked={profanity.value} onChange={profanity.setValue} />
          </FormRow>
          <FieldAutoSaveStatus state={profanity} />

          <FormRow
            label="Filter custom words"
            description={`Block words from your custom word list (${data.customWordCount} ${
              data.customWordCount === 1 ? "word" : "words"
            }).`}
          >
            <Toggle
              checked={customWords.value}
              onChange={customWords.setValue}
            />
          </FormRow>
          <FieldAutoSaveStatus state={customWords} />

          <FormRow
            label="Warn users"
            description="Send a public message in the channel when content is filtered."
          >
            <Toggle checked={warn.value} onChange={warn.setValue} />
          </FormRow>
          <FieldAutoSaveStatus state={warn} />
        </MasterSubToggleGroup>
      </Panel>

      <WordListPanel
        title="Custom word list"
        description="Words specific to your community. Toggle individual words on or off, or remove them permanently."
        category={WordCategory.CUSTOM}
        maxLength={data.limits!.wordMaxLength}
        countLabel={`${data.customWordCount} ${data.customWordCount === 1 ? "word" : "words"}`}
        gateContents={true}
        onChanged={onSaved}
      />

      <WordListPanel
        title="Allowed words"
        description="Words on this list are never filtered, even if they match a rule. Use this to handle false positives."
        category={WordCategory.ALLOWED}
        maxLength={data.limits!.wordMaxLength}
        countLabel={`${data.allowedWordCount} ${data.allowedWordCount === 1 ? "word" : "words"}`}
        gateContents={false}
        onChanged={onSaved}
      />
    </>
  );
};
