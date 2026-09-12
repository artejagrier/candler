"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Bot, Cloud, FolderKanban, KeyRound } from "lucide-react";
import { completeOnboardingAction, createProjectAction } from "@/lib/product/actions";

export function OnboardingClient() {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  async function finish(href: string) {
    const result = await completeOnboardingAction();
    if (!result.ok) {
      setError(result.error);
      return;
    }
    location.href = href;
  }

  return (
    <div className="onboarding">
      <p className="eyebrow">Setup</p>
      <h1>Welcome to Candler.</h1>
      <p>Create a project, then add a secret, upload a backup, or ask Candler. You will not see this again after you continue.</p>
      <label>
        Project name
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="My project" />
      </label>
      <button
        className="primary-button"
        disabled={!name.trim() || pending}
        onClick={() => start(async () => {
          const project = await createProjectAction({ name });
          if (!project.ok) {
            setError(project.error);
            return;
          }
          await finish("/app");
        })}
      >
        Create project <ArrowRight />
      </button>
      <div className="prompt-grid" style={{ marginTop: "1.5rem" }}>
        <button disabled={pending} onClick={() => start(() => finish("/app/vault"))}><KeyRound /> Add a secret</button>
        <button disabled={pending} onClick={() => start(() => finish("/app/cloud"))}><Cloud /> Upload a project</button>
        <button disabled={pending} onClick={() => start(() => finish("/app/agent"))}><Bot /> Ask Candler</button>
        <button disabled={pending} onClick={() => start(() => finish("/app/projects"))}><FolderKanban /> Skip for now</button>
      </div>
      {error ? <p className="security-note">{error}</p> : null}
    </div>
  );
}
