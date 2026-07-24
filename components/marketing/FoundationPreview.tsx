"use client";

import { KeyRound, Mail } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Kbd } from "@/components/ui/Kbd";
import { Modal } from "@/components/ui/Modal";
import { Surface } from "@/components/ui/Surface";

/**
 * A compact, interactive tour of the Phase 1A design system, shown on the
 * foundation landing page. Demonstrates glass surfaces, buttons, semantic
 * badges, inputs, and the accessible modal. Replaced by real marketing content
 * in Phase 1B.
 */
export function FoundationPreview() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <Surface glow className="animate-rise p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Design system</h2>
          <p className="mt-1 text-sm text-fog">
            The reusable, accessible building blocks behind Candler.
          </p>
        </div>
        <Badge tone="purple">Phase 1A foundation</Badge>
      </div>

      {/* Buttons */}
      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-muted">
          Buttons
        </p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          <Button variant="primary">Create workspace</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </div>

      {/* Badges */}
      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-muted">
          Status badges
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="success">Healthy</Badge>
          <Badge tone="warning">Rotation due</Badge>
          <Badge tone="danger">Disconnected</Badge>
          <Badge tone="info">Syncing</Badge>
          <Badge tone="neutral">Draft</Badge>
        </div>
      </div>

      {/* Input + modal */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-muted">
            Inputs
          </p>
          <label htmlFor="preview-email" className="sr-only">
            Email address
          </label>
          <div className="mt-3">
            <Input
              id="preview-email"
              type="email"
              icon={Mail}
              placeholder="you@candler.dev"
            />
          </div>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-muted">
            Dialog
          </p>
          <div className="mt-3">
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              <KeyRound className="size-4" aria-hidden="true" />
              Open example dialog
            </Button>
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm text-fog">
        Inside the workspace, press <Kbd>⌘</Kbd> <Kbd>K</Kbd> to open the command
        palette.
      </p>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Example dialog"
        description="An accessible, focus-trapped modal from the design system."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setModalOpen(false)}>
              Got it
            </Button>
          </>
        }
      >
        <p>
          Press <Kbd>Esc</Kbd>, click the backdrop, or use the close button to
          dismiss. Focus is trapped while open and restored to the trigger on
          close.
        </p>
      </Modal>
    </Surface>
  );
}
