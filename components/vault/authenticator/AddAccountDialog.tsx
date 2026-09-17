"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, ImageUp, Keyboard, ScanLine } from "lucide-react";
import { addAuthenticatorAction } from "@/lib/product/actions";
import {
  AUTHENTICATOR_UNREADABLE,
  authenticatorSetupError,
  parseOtpAuthUri,
  parseTotpSetup,
  type ParsedTotpSetup,
} from "@/lib/vault/otpauth";
import { AuthenticatorDialog } from "@/components/vault/authenticator/AuthenticatorDialog";

type Step = "choose" | "scan" | "key" | "confirm";

async function openCamera() {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
  } catch {
    return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }
}

async function decodeQrPayload(source: ImageData | HTMLVideoElement | HTMLCanvasElement | ImageBitmap) {
  const Detector = (window as Window & { BarcodeDetector?: new (options: { formats: string[] }) => {
    detect: (input: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
  } }).BarcodeDetector;
  if (typeof Detector === "function") {
    try {
      const detector = new Detector({ formats: ["qr_code"] });
      const detected = await detector.detect(source as CanvasImageSource);
      const value = detected.find((item) => item.rawValue)?.rawValue?.trim();
      if (value) return value;
    } catch {
      // Native detector is optional; jsQR is the local fallback.
    }
  }
  const { default: jsQR } = await import("jsqr");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return "";
  if (source instanceof ImageData) {
    return jsQR(source.data, source.width, source.height)?.data ?? "";
  }
  const width = "videoWidth" in source ? source.videoWidth : source.width;
  const height = "videoHeight" in source ? source.videoHeight : source.height;
  if (!width || !height) return "";
  canvas.width = width;
  canvas.height = height;
  context.drawImage(source as CanvasImageSource, 0, 0, width, height);
  const image = context.getImageData(0, 0, width, height);
  return jsQR(image.data, image.width, image.height)?.data ?? "";
}

export function AddAccountDialog({
  open,
  onClose,
  onCreated,
  onViewExisting,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (entry: {
    id: string;
    issuer: string;
    account_name: string;
    notes?: string | null;
    pinned: boolean;
    last_used_at: string | null;
    created_at: string;
    updated_at: string;
  }) => void;
  onViewExisting: (id: string) => void;
}) {
  const [step, setStep] = useState<Step>("choose");
  const [error, setError] = useState("");
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [notes, setNotes] = useState("");
  const [setupKey, setSetupKey] = useState("");
  const [preview, setPreview] = useState<ParsedTotpSetup | null>(null);
  const [rawUri, setRawUri] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lockRef = useRef(false);
  const saving = useRef(false);

  function reset() {
    setStep("choose");
    setError("");
    setDuplicateId(null);
    setBusy(false);
    setAccountName("");
    setNotes("");
    setSetupKey("");
    setPreview(null);
    setRawUri("");
    lockRef.current = false;
    saving.current = false;
    stopCamera();
  }

  function close() {
    if (busy) return;
    reset();
    onClose();
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
  }

  function acceptPayload(text: string) {
    if (lockRef.current) return;
    try {
      const parsed = parseOtpAuthUri(text);
      lockRef.current = true;
      stopCamera();
      setRawUri(text.trim());
      setPreview(parsed);
      setAccountName(parsed.issuer || parsed.accountName);
      setError("");
      setStep("confirm");
    } catch (caught) {
      setError(authenticatorSetupError(caught));
    }
  }

  useEffect(() => {
    if (!open || step !== "scan") {
      stopCamera();
      return;
    }
    let cancelled = false;
    let frame = 0;
    async function start() {
      setError("");
      try {
        const stream = await openCamera();
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        if (!video.videoWidth) {
          stream.getTracks().forEach((track) => track.stop());
          const fallback = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          if (cancelled) {
            fallback.getTracks().forEach((track) => track.stop());
            return;
          }
          streamRef.current = fallback;
          video.srcObject = fallback;
          await video.play();
        }
        const tick = async () => {
          if (cancelled || lockRef.current) return;
          if (video.readyState >= 2) {
            try {
              const payload = await decodeQrPayload(video);
              if (payload && !lockRef.current) {
                try {
                  const parsed = parseOtpAuthUri(payload);
                  lockRef.current = true;
                  stopCamera();
                  setRawUri(payload.trim());
                  setPreview(parsed);
                  setAccountName(parsed.issuer || parsed.accountName);
                  setError("");
                  setStep("confirm");
                  return;
                } catch (caught) {
                  setError(authenticatorSetupError(caught));
                }
              }
            } catch {
              // Keep scanning; a single failed frame is not a user error.
            }
          }
          frame = window.requestAnimationFrame(() => void tick());
        };
        frame = window.requestAnimationFrame(() => void tick());
      } catch {
        if (!cancelled) setError("Camera isn't available. Upload a QR screenshot or enter the setup key.");
      }
    }
    void start();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      stopCamera();
    };
  }, [open, step]);

  async function onImage(file: File) {
    setError("");
    try {
      const bitmap = await createImageBitmap(file);
      const payload = await decodeQrPayload(bitmap);
      bitmap.close();
      if (!payload) {
        setError(AUTHENTICATOR_UNREADABLE);
        return;
      }
      acceptPayload(payload);
    } catch {
      setError(AUTHENTICATOR_UNREADABLE);
    }
  }

  async function submitPreview() {
    if (saving.current) return;
    const parsed = preview;
    if (!parsed) return;
    const issuer = (parsed.issuer || accountName).trim();
    const account = (parsed.accountName || accountName).trim();
    if (!issuer) {
      setError("Enter an account name so you can recognize this code later.");
      return;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    setDuplicateId(null);
    try {
      const result = await addAuthenticatorAction({
        uri: rawUri || undefined,
        secret: rawUri ? undefined : parsed.secret,
        issuer,
        accountName: account || issuer,
        notes: notes.trim() || undefined,
      });
      if (!result.ok && result.code === "DUPLICATE" && result.existingId) {
        setDuplicateId(result.existingId);
        setError("This account is already in Candler.");
        return;
      }
      if (!result.ok || !result.data?.id) {
        setError(result.ok ? "This account could not be saved. Try again." : result.error);
        return;
      }
      const now = new Date().toISOString();
      onCreated({
        id: result.data.id,
        issuer,
        account_name: account || issuer,
        notes: notes.trim() || null,
        pinned: false,
        last_used_at: null,
        created_at: now,
        updated_at: now,
      });
      reset();
    } catch {
      setError("This account could not be saved. Try again.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  async function submitKey(event: FormEvent) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    setDuplicateId(null);
    try {
      const parsed = parseTotpSetup({ accountName, secret: setupKey });
      const result = await addAuthenticatorAction({
        secret: parsed.secret,
        issuer: parsed.issuer,
        accountName: parsed.accountName,
        notes: notes.trim() || undefined,
      });
      if (!result.ok && result.code === "DUPLICATE" && result.existingId) {
        setDuplicateId(result.existingId);
        setError("This account is already in Candler.");
        return;
      }
      if (!result.ok || !result.data?.id) {
        setError(result.ok ? "This account could not be saved. Try again." : result.error);
        return;
      }
      const now = new Date().toISOString();
      onCreated({
        id: result.data.id,
        issuer: parsed.issuer,
        account_name: parsed.accountName,
        notes: notes.trim() || null,
        pinned: false,
        last_used_at: null,
        created_at: now,
        updated_at: now,
      });
      reset();
    } catch (caught) {
      setError(authenticatorSetupError(caught) === AUTHENTICATOR_UNREADABLE && caught instanceof Error && caught.message.startsWith("Enter")
        ? caught.message
        : authenticatorSetupError(caught));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  async function pasteKey() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return;
      setSetupKey(text.trim());
      setError("");
    } catch {
      setError("Candler couldn't read the clipboard. Paste the setup key manually.");
    }
  }

  if (!open) return null;

  const title = step === "scan" ? "Scan QR code" : step === "key" ? "Enter setup key" : step === "confirm" ? "Ready to add" : "Add an account";
  const description = step === "choose"
    ? "Scan the QR code shown by the service you're securing."
    : step === "scan"
      ? "Point your camera at the QR code, or upload a screenshot."
      : step === "key"
        ? "Use the setup key from “Can't scan the QR code?”"
        : undefined;

  return (
    <AuthenticatorDialog
      open
      title={title}
      description={description}
      preventClose={busy}
      size={step === "scan" ? "scan" : "default"}
      onClose={close}
      footer={step === "confirm" ? (
        <>
          <button type="button" className="secondary-button" onClick={() => { lockRef.current = false; setStep("choose"); }} disabled={busy}>Back</button>
          <button type="button" className="primary-button" onClick={() => void submitPreview()} disabled={busy}>
            {busy ? "Adding account…" : "Add to Candler"}
          </button>
        </>
      ) : step === "key" ? (
        <>
          <button type="button" className="secondary-button" onClick={() => setStep("choose")} disabled={busy}>Back</button>
          <button form="authenticator-key-form" type="submit" className="primary-button" disabled={busy}>
            {busy ? "Adding account…" : "Add account"}
          </button>
        </>
      ) : step === "scan" ? (
        <button type="button" className="secondary-button" onClick={() => setStep("choose")}>Enter setup key instead</button>
      ) : null}
    >
      {step === "choose" ? (
        <div className="authenticator-choices">
          <button type="button" className="authenticator-choice" onClick={() => { lockRef.current = false; setError(""); setStep("scan"); }}>
            <ScanLine />
            <span>
              <b>Scan QR code</b>
              <small>Recommended. Use your camera or a screenshot.</small>
            </span>
          </button>
          <button type="button" className="authenticator-choice" onClick={() => { setError(""); setStep("key"); }}>
            <Keyboard />
            <span>
              <b>Enter setup key</b>
              <small>For sites that show a key instead of a code.</small>
            </span>
          </button>
        </div>
      ) : null}

      {step === "scan" ? (
        <div className="authenticator-scan">
          <div className="authenticator-viewfinder">
            <video ref={videoRef} autoPlay playsInline muted />
            <span />
            {error ? <p className="authenticator-viewfinder-empty">{error}</p> : null}
          </div>
          <div className="authenticator-scan-actions">
            <button type="button" className="secondary-button" onClick={() => fileRef.current?.click()}>
              <ImageUp />Upload QR image
            </button>
            <button type="button" className="secondary-button" onClick={() => videoRef.current?.play().catch(() => undefined)}>
              <Camera />Use camera
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void onImage(file);
            }}
          />
        </div>
      ) : null}

      {step === "key" ? (
        <form id="authenticator-key-form" onSubmit={(event) => void submitKey(event)}>
          <label>
            Account name
            <input
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              placeholder="GitHub"
              autoComplete="off"
              required
            />
          </label>
          <label>
            Setup key
            <textarea
              value={setupKey}
              onChange={(event) => setSetupKey(event.target.value)}
              placeholder="Paste the key from the service"
              autoComplete="off"
              required
            />
          </label>
          <label>
            Notes <small>(optional)</small>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Production admin"
              autoComplete="off"
              maxLength={400}
            />
          </label>
          <button type="button" className="text-link authenticator-paste" onClick={() => void pasteKey()}>Paste</button>
        </form>
      ) : null}

      {step === "confirm" && preview ? (
        <div className="authenticator-confirm">
          <span className="authenticator-mark">{(preview.issuer || accountName || "?")[0]}</span>
          {preview.issuer ? <b>{preview.issuer}</b> : (
            <label>
              Account name
              <input value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="GitHub" required />
            </label>
          )}
          <small>{preview.accountName && preview.accountName !== preview.issuer ? preview.accountName : "Ready to add"}</small>
          <label>
            Notes <small>(optional)</small>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value.slice(0, 400))}
              placeholder="Work account"
              autoComplete="off"
              maxLength={400}
            />
          </label>
        </div>
      ) : null}

      {error ? <p className="security-note" role="alert">{error}</p> : null}
      {duplicateId ? (
        <button
          type="button"
          className="primary-button authenticator-view-existing"
          onClick={() => {
            const id = duplicateId;
            reset();
            onViewExisting(id);
          }}
        >
          View account
        </button>
      ) : null}
    </AuthenticatorDialog>
  );
}
