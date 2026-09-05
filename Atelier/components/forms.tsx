"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { Button } from "./ui";
import { useToast } from "./toast";

const EXIT_MS = 180;
const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function animateDialogClose(dialog: HTMLDialogElement | null) {
  if (!dialog || dialog.dataset.closing === "true") return;
  dialog.dataset.closing = "true";
  window.setTimeout(() => {
    dialog.close();
    delete dialog.dataset.closing;
  }, EXIT_MS);
}

export function ActionForm({
  action,
  successMessage,
  closeDialog = true,
  children,
  ...props
}: Omit<FormHTMLAttributes<HTMLFormElement>, "action"> & {
  action: (formData: FormData) => Promise<void>;
  successMessage: string;
  closeDialog?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const toast = useToast();
  return (
    <form
      {...props}
      ref={ref}
      action={async (formData) => {
        try {
          await action(formData);
          toast.show(successMessage);
          if (closeDialog) animateDialogClose(ref.current?.closest("dialog") ?? null);
        } catch (error) {
          toast.show(error instanceof Error ? error.message : "Something went wrong.", "error");
        }
      }}
    >
      {children}
    </form>
  );
}

export function Modal({
  title,
  label,
  variant = "primary",
  children,
}: {
  title: string;
  label: string;
  variant?: "primary" | "ghost" | "danger" | "quiet";
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === ref.current) animateDialogClose(ref.current);
  }

  return (
    <>
      <Button type="button" variant={variant} onClick={() => ref.current?.showModal()}>
        {label}
      </Button>
      <dialog
        ref={ref}
        className="app-dialog"
        onClick={closeOnBackdrop}
        onCancel={(event) => { event.preventDefault(); animateDialogClose(ref.current); }}
      >
        <div className="dialog-panel">
          <div className="flex items-center justify-between border-b border-line/80 px-5 py-4 sm:px-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-mute">Atelier</p>
              <h2 className="mt-0.5 font-serif text-2xl">{title}</h2>
            </div>
            <Button className="h-9 w-9 rounded-full p-0 text-lg" aria-label="Close dialog" variant="quiet" type="button" onClick={() => animateDialogClose(ref.current)}>
              ×
            </Button>
          </div>
          <div className="dialog-body">{children}</div>
        </div>
      </dialog>
    </>
  );
}

export function ActionButton({
  action,
  children,
  variant = "ghost",
  successMessage = "Updated",
  confirmMessage,
  removalSelector,
}: {
  action: () => Promise<void>;
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger" | "quiet";
  successMessage?: string;
  confirmMessage?: string;
  removalSelector?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant={variant}
      disabled={busy}
      data-busy={busy || undefined}
      onClick={async (event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        const removal = /delet|remov/i.test(successMessage);
        const motionItems = removalSelector
          ? [...document.querySelectorAll<HTMLElement>(removalSelector)]
          : removal ? [event.currentTarget.closest<HTMLElement>("[data-motion-item], .problem-card, tr")].filter((item): item is HTMLElement => Boolean(item)) : [];
        setBusy(true);
        try {
          if (motionItems.length) { motionItems.forEach((item) => item.classList.add("is-removing")); await wait(190); }
          await action();
          toast.show(successMessage);
          router.refresh();
        } catch (error) {
          motionItems.forEach((item) => item.classList.remove("is-removing"));
          toast.show(error instanceof Error ? error.message : "Something went wrong.", "error");
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
    </Button>
  );
}
