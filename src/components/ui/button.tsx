import * as React from "react";
import { cn } from "@/lib/utils";

// Esquinas rectas siempre. El dorado es SOLO para la acción principal.
type Variant = "accent" | "ghost" | "white";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  accent: "bg-gold text-on-accent hover:bg-gold-dark",
  ghost: "bg-transparent text-white border border-white/50 hover:bg-teal-action hover:border-teal-action",
  white: "bg-white text-charcoal hover:bg-mist",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2.5 text-[0.8125rem]",
  md: "px-6 py-4 text-[0.9rem]",
  lg: "px-8 py-6 text-base",
};

type Options = { variant?: Variant; size?: Size; className?: string };

/** Para enlaces con aspecto de botón: <Link className={buttonClasses({ variant: "accent" })} /> */
export function buttonClasses({ variant = "accent", size = "md", className }: Options = {}) {
  return cn(
    "btn inline-flex min-h-12 items-center justify-center gap-2 rounded-full font-normal uppercase tracking-[0.02em] cursor-pointer",
    "disabled:cursor-not-allowed disabled:opacity-40",
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & Omit<Options, "className">;

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps & { className?: string }) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}
