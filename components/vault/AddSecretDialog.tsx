"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { VaultDialog } from "@/components/vault/VaultDialog";
import { detectService } from "@/lib/vault/env-import";
import {
  COMMON_PROVIDER_EXAMPLES,
  SECRET_PROVIDERS,
  SECRET_TYPE_HELP,
  SECRET_TYPES,
  emptyToNull,
  parseCreateSecretInput,
  type SecretTypeId,
} from "@/lib/vault/secret-types";

type Project = { id: string; name: string; environments: { id: string; name: string; kind: string }[] };

export type AddSecretPayload = ReturnType<typeof parseCreateSecretInput>;

export function AddSecretDialog({
  open,
  projects,
  projectId,
  environmentId,
  saving,
  error,
  onProjectChange,
  onEnvironmentChange,
  onClose,
  onCreate,
}: {
  open: boolean;
  projects: Project[];
  projectId: string;
  environmentId: string;
  saving: boolean;
  error: string;
  onProjectChange: (projectId: string) => void;
  onEnvironmentChange: (environmentId: string) => void;
  onClose: () => void;
  onCreate: (payload: AddSecretPayload) => Promise<void> | void;
}) {
  const baseId = useId();
  const [secretType, setSecretType] = useState<SecretTypeId>("api_key");
  const [label, setLabel] = useState("");
  const [keyName, setKeyName] = useState("");
  const [value, setValue] = useState("");
  const [showValue, setShowValue] = useState(false);
  const [provider, setProvider] = useState("OpenAI");
  const [notes, setNotes] = useState("");
  const [localError, setLocalError] = useState("");
  const help = SECRET_TYPE_HELP[secretType];
  const environments = projects.find((project) => project.id === projectId)?.environments ?? [];
  const ids = {
    type: `${baseId}-type`,
    name: `${baseId}-name`,
    key: `${baseId}-key`,
    value: `${baseId}-value`,
    env: `${baseId}-env`,
    project: `${baseId}-project`,
    provider: `${baseId}-provider`,
    notes: `${baseId}-notes`,
  };

  useEffect(() => {
    if (!open) return;
    setSecretType("api_key");
    setLabel("");
    setKeyName("");
    setValue("");
    setShowValue(false);
    setProvider(SECRET_TYPE_HELP.api_key.provider);
    setNotes("");
    setLocalError("");
  }, [open]);

  const example = useMemo(() => {
    if (secretType === "env_var") {
      return {
        kicker: "From your .env",
        line: `${help.keyExample}=${help.valuePlaceholder}`,
        name: help.nameExample,
      };
    }
    return {
      kicker: "Example",
      line: `${help.keyExample}=${help.valuePlaceholder}`,
      name: help.nameExample,
    };
  }, [help, secretType]);

  function applyType(next: SecretTypeId) {
    setSecretType(next);
    setProvider(SECRET_TYPE_HELP[next].provider);
  }

  function onKeyChange(next: string) {
    setKeyName(next);
    const detected = detectService(next);
    if (detected !== "Custom") setProvider(detected);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setLocalError("");
    try {
      const payload = parseCreateSecretInput({
        projectId,
        environmentId: emptyToNull(environmentId),
        serviceName: provider,
        name: keyName,
        label,
        value,
        secretType,
        notes,
      });
      await onCreate(payload);
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Couldn't save this secret. Please try again.");
    }
  }

  const shownError = localError || error;

  return (
    <VaultDialog
      open={open}
      title="Add Secret"
      preventClose={saving}
      onClose={() => { if (!saving) onClose(); }}
      footer={(
        <>
          <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancel</button>
          <button form="vault-add-form" type="submit" className="primary-button" disabled={saving} aria-busy={saving}>
            {saving ? "Saving…" : "Save Secret"}
          </button>
        </>
      )}
    >
      <form id="vault-add-form" className="vault-add-form" onSubmit={(event) => void onSubmit(event)} aria-busy={saving}>
        <label htmlFor={ids.type}>Secret Type
          <select id={ids.type} name="secretType" value={secretType} onChange={(event) => applyType(event.target.value as SecretTypeId)} disabled={saving}>
            {SECRET_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>

        <label htmlFor={ids.name}>Name
          <input
            id={ids.name}
            name="label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={help.nameExample}
            autoComplete="off"
            data-autofocus
            aria-describedby={`${ids.name}-help`}
            disabled={saving}
          />
        </label>
        <p id={`${ids.name}-help`} className="vault-add-help">Give this secret a name you’ll recognize.</p>

        <label htmlFor={ids.key}>Key / Variable Name
          <input
            id={ids.key}
            name="name"
            required
            value={keyName}
            onChange={(event) => onKeyChange(event.target.value)}
            placeholder={help.keyExample}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={`${ids.key}-help`}
            disabled={saving}
          />
        </label>
        <p id={`${ids.key}-help`} className="vault-add-help">The left side of <code>=</code> in your .env file. Never paste the secret here.</p>

        <label htmlFor={ids.value}>Secret Value
          <span className="vault-add-value">
            <input
              id={ids.value}
              name="value"
              required
              type={showValue ? "text" : "password"}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={help.valuePlaceholder}
              autoComplete="off"
              spellCheck={false}
              aria-describedby={`${ids.value}-help`}
              disabled={saving}
            />
            <button
              type="button"
              className="vault-add-reveal"
              onClick={() => setShowValue((current) => !current)}
              aria-pressed={showValue}
              aria-label={showValue ? "Hide secret value" : "Show secret value"}
              disabled={saving}
            >
              {showValue ? <EyeOff /> : <Eye />}
            </button>
          </span>
        </label>
        <p id={`${ids.value}-help`} className="vault-add-help">Paste the actual key, token, password, or secret here.</p>

        <div className="vault-add-meta">
          <label htmlFor={ids.env}>Environment
            <select id={ids.env} name="environmentId" value={environmentId} onChange={(event) => onEnvironmentChange(event.target.value)} disabled={saving}>
              <option value="">No environment</option>
              {environments.map((environment) => <option key={environment.id} value={environment.id}>{environment.name}</option>)}
            </select>
          </label>
          <label htmlFor={ids.project}>Project
            <select
              id={ids.project}
              name="projectId"
              value={projectId}
              onChange={(event) => onProjectChange(event.target.value)}
              disabled={saving}
            >
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
        </div>

        <label htmlFor={ids.provider}>Provider
          <select id={ids.provider} name="serviceName" value={provider} onChange={(event) => setProvider(event.target.value)} disabled={saving}>
            {SECRET_PROVIDERS.map((item) => <option key={item} value={item}>{item}</option>)}
            {provider && !SECRET_PROVIDERS.includes(provider as typeof SECRET_PROVIDERS[number]) ? (
              <option value={provider}>{provider}</option>
            ) : null}
          </select>
        </label>

        <label htmlFor={ids.notes}>Notes
          <textarea
            id={ids.notes}
            name="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Used by production API routes."
            maxLength={4000}
            disabled={saving}
          />
        </label>
        <p className="vault-add-help">Optional. Never put the secret value in notes.</p>

        <div className="vault-add-example">
          <p className="vault-add-kicker">{example.kicker}</p>
          <code>{example.line}</code>
          {secretType === "env_var" ? (
            <dl>
              <div><dt>Name</dt><dd>{example.name}</dd></div>
              <div><dt>Key</dt><dd>{help.keyExample}</dd></div>
              <div><dt>Secret Value</dt><dd>{help.valuePlaceholder}</dd></div>
            </dl>
          ) : (
            <p>Key = {help.keyExample}<br />Value = {help.valuePlaceholder}</p>
          )}
        </div>

        <div className="vault-add-providers">
          <p className="vault-add-kicker">Common examples</p>
          <ul>
            {COMMON_PROVIDER_EXAMPLES.map((item) => (
              <li key={item.provider}>
                <b>{item.provider}</b>
                <span>{item.keys.join(" · ")}</span>
              </li>
            ))}
          </ul>
        </div>

        {shownError ? <p className="vault-add-error" role="alert">{shownError}</p> : null}
      </form>
    </VaultDialog>
  );
}
