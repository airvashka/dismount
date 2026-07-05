"use client";

// Formulář se server akcí, který před odesláním vyžádá potvrzení.
// Pro nevratné akce (zrušení akce apod.).

import type { ReactNode } from "react";

export function ConfirmForm({
  action,
  message,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
