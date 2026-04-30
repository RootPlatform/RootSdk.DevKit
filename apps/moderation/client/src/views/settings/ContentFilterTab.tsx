import React from "react";
import { moderationServiceClient } from "@moderation/gen-client";
import {
  GetSettingsResponse,
  WordCategory,
  UrlFilterMode,
} from "@moderation/gen-shared";
import { FormRow, Toggle, styles } from "../Settings";
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
  const usernameFilter = useFieldAutoSave(
    data.usernameFilter?.enabled ?? false,
    async (v) => {
      await moderationServiceClient.setUsernameFilterEnabled({ enabled: v });
      onSaved();
    },
  );

  const urlFilterEnabled = useFieldAutoSave(
    data.urlFilter?.enabled ?? false,
    async (v) => {
      await moderationServiceClient.setUrlFilterEnabled({ enabled: v });
      onSaved();
    },
  );
  const urlFilterMode = useFieldAutoSave<UrlFilterMode>(
    data.urlFilter?.mode ?? UrlFilterMode.BLOCKLIST,
    async (v) => {
      await moderationServiceClient.setUrlFilterMode({ mode: v });
      onSaved();
    },
  );
  const urlFilterBlockRootInvites = useFieldAutoSave(
    data.urlFilter?.blockRootInvites ?? false,
    async (v) => {
      await moderationServiceClient.setUrlFilterBlockRootInvites({
        enabled: v,
      });
      onSaved();
    },
  );
  const urlFilterWarn = useFieldAutoSave(
    data.urlFilter?.warnUsers ?? false,
    async (v) => {
      await moderationServiceClient.setUrlFilterWarnUsers({ enabled: v });
      onSaved();
    },
  );

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

      {/* Username filter — separate Panel since it's a different action
          (ban a member, not delete a message) but shares the matchers
          (slurs/profanity/custom + allowed-words cancellation). Lives
          in this tab so admins manage all word-list-driven rules in
          one place. */}
      <Panel
        title="Username filter"
        description="Ban members whose nicknames match the same word lists. Uses the slur, profanity, and custom-word matchers above."
      >
        <FormRow
          label="Enable username filter"
          description="When enabled, members are banned automatically if their community nickname matches a filter rule. Triggers on nickname change and at first attach."
        >
          <Toggle
            checked={usernameFilter.value}
            onChange={usernameFilter.setValue}
          />
        </FormRow>
        <FieldAutoSaveStatus state={usernameFilter} />
      </Panel>

      {/* URL filter — separate Panel since the matchers (hostname suffix
          comparison) and the entry shape (domains) differ from the
          word-substring matchers above. Lives in this tab so admins
          manage all rule-driven message-content controls in one place. */}
      <Panel
        title="URL filter"
        description="Block messages containing links to specific domains, or allow only an approved set."
      >
        <MasterSubToggleGroup
          enabled={urlFilterEnabled.value}
          master={
            <>
              <FormRow
                label="Enable URL filter"
                description="When enabled, messages whose links match the rules below are deleted automatically. Runs on both new messages and edits."
              >
                <Toggle
                  checked={urlFilterEnabled.value}
                  onChange={urlFilterEnabled.setValue}
                />
              </FormRow>
              <FieldAutoSaveStatus state={urlFilterEnabled} />
            </>
          }
        >
          <FormRow
            label="Mode"
            description="Blocklist deletes messages whose links match the domain list. Allowlist deletes messages whose links are NOT on the list (an empty allowlist blocks every URL)."
          >
            <select
              className={styles.input}
              value={urlFilterMode.value}
              onChange={(e) =>
                urlFilterMode.setValue(Number(e.target.value) as UrlFilterMode)
              }
              aria-label="URL filter mode"
            >
              <option value={UrlFilterMode.BLOCKLIST}>Blocklist</option>
              <option value={UrlFilterMode.ALLOWLIST}>Allowlist</option>
            </select>
          </FormRow>
          <FieldAutoSaveStatus state={urlFilterMode} />

          <FormRow
            label="Block Root invite links"
            description="Delete any message containing a link to another Root community (rootapp.gg/<code>). Independent of the mode above."
          >
            <Toggle
              checked={urlFilterBlockRootInvites.value}
              onChange={urlFilterBlockRootInvites.setValue}
            />
          </FormRow>
          <FieldAutoSaveStatus state={urlFilterBlockRootInvites} />

          <FormRow
            label="Warn users"
            description="Send a public message in the channel when a link is filtered."
          >
            <Toggle
              checked={urlFilterWarn.value}
              onChange={urlFilterWarn.setValue}
            />
          </FormRow>
          <FieldAutoSaveStatus state={urlFilterWarn} />
        </MasterSubToggleGroup>
      </Panel>

      <WordListPanel
        title="URL domain list"
        description={
          urlFilterMode.value === UrlFilterMode.ALLOWLIST
            ? "Domains in this list are the ONLY ones allowed in messages. Domains apply suffix-style — adding 'github.com' also allows 'docs.github.com'."
            : "Domains in this list are blocked. Domains apply suffix-style — adding 'evil.com' also blocks 'sub.evil.com'."
        }
        category={WordCategory.URL_DOMAIN}
        maxLength={data.limits!.wordMaxLength}
        countLabel={`${data.urlDomainCount} ${data.urlDomainCount === 1 ? "domain" : "domains"}`}
        gateContents={false}
        onChanged={onSaved}
      />

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
