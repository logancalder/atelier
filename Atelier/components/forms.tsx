"use client";

import { useRouter } from "next/navigation";
import { useRef, type FormHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { Button } from "./ui";
import { useToast } from "./toast";

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
          if (closeDialog) ref.current?.closest("dialog")?.close();
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
    if (event.target === ref.current) ref.current?.close();
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
      >
        <div className="dialog-panel">
          <div className="flex items-center justify-between border-b border-line/80 px-5 py-4 sm:px-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-mute">Atelier</p>
              <h2 className="mt-0.5 font-serif text-2xl">{title}</h2>
            </div>
            <Button className="h-9 w-9 rounded-full p-0 text-lg" aria-label="Close dialog" variant="quiet" type="button" onClick={() => ref.current?.close()}>
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
}: {
  action: () => Promise<void>;
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger" | "quiet";
  successMessage?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  return (
    <Button
      type="button"
      variant={variant}
      onClick={async () => {
        try {
          await action();
          toast.show(successMessage);
          router.refresh();
        } catch (error) {
          toast.show(error instanceof Error ? error.message : "Something went wrong.", "error");
        }
      }}
    >
      {children}
    </Button>
  );
}
