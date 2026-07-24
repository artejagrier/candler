"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, User } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormStatus } from "@/components/auth/FormStatus";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  contactSchema,
  type ContactInput,
} from "@/lib/marketing/contact-schema";
import { submitContactAction } from "@/lib/marketing/contact";

export function ContactForm() {
  const [status, setStatus] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", message: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus(null);
    const result = await submitContactAction(values);
    if (result.ok) {
      setStatus({ type: "success", message: result.message });
      reset();
    } else {
      setStatus({ type: "error", message: result.error });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {status ? <FormStatus type={status.type} message={status.message} /> : null}

      <FormField label="Name" error={errors.name?.message}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            icon={User}
            autoComplete="name"
            placeholder="Ada Lovelace"
            invalid={Boolean(errors.name)}
            {...register("name")}
          />
        )}
      </FormField>

      <FormField label="Email" error={errors.email?.message}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            icon={Mail}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            invalid={Boolean(errors.email)}
            {...register("email")}
          />
        )}
      </FormField>

      <FormField label="Message" error={errors.message?.message}>
        {({ id, describedBy }) => (
          <Textarea
            id={id}
            aria-describedby={describedBy}
            rows={5}
            placeholder="How can we help?"
            invalid={Boolean(errors.message)}
            {...register("message")}
          />
        )}
      </FormField>

      <SubmitButton pending={isSubmitting} pendingLabel="Sending…">
        Send message
      </SubmitButton>
    </form>
  );
}
