import * as React from "react";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
};

export function Field({ label, error, hint, id, className, ...props }: FieldProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const inputId = id ?? props.name;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="label-micro text-steel">{label}</label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "w-full rounded-xl border bg-black px-4 py-3.5 text-base text-white placeholder:text-ash",
          error ? "border-danger" : "border-ash focus:border-white",
          "disabled:cursor-not-allowed disabled:border-shadow disabled:text-ash",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-sm text-danger">{error}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-steel">{hint}</p>
      ) : null}
    </div>
  );
}

const controlBase =
  "w-full rounded-xl border bg-black px-4 py-3.5 text-base text-white placeholder:text-ash disabled:cursor-not-allowed disabled:border-shadow disabled:text-ash";

function Wrapper({ label, id, error, hint, children }: { label: string; id: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="label-micro text-steel">{label}</label>
      {children}
      {error ? <p id={`${id}-error`} role="alert" className="text-sm text-danger">{error}</p> : hint ? <p id={`${id}-hint`} className="text-sm text-steel">{hint}</p> : null}
    </div>
  );
}

export function TextAreaField({ label, error, hint, id, className, ...props }: FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const inputId = id ?? props.name ?? label;
  return (
    <Wrapper label={label} id={inputId} error={error} hint={hint}>
      <textarea id={inputId} rows={4} aria-invalid={error ? true : undefined}
        className={cn(controlBase, error ? "border-danger" : "border-ash focus:border-white", className)} {...props} />
    </Wrapper>
  );
}

export function SelectField({ label, error, hint, id, className, children, ...props }: FieldProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const inputId = id ?? props.name ?? label;
  return (
    <Wrapper label={label} id={inputId} error={error} hint={hint}>
      <select id={inputId} aria-invalid={error ? true : undefined}
        className={cn(controlBase, error ? "border-danger" : "border-ash focus:border-white", className)} {...props}>
        {children}
      </select>
    </Wrapper>
  );
}

export function CheckField({ label, hint, error, id, ...props }: { label: React.ReactNode; hint?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const inputId = id ?? props.name ?? "check";
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="flex cursor-pointer items-center gap-3 text-base">
        <input id={inputId} type="checkbox" className="size-5 accent-[#FFC000]" {...props} />
        {label}
      </label>
      {hint && <p className="pl-8 text-sm text-steel">{hint}</p>}
      {error && <p role="alert" className="pl-8 text-sm text-danger">{error}</p>}
    </div>
  );
}
