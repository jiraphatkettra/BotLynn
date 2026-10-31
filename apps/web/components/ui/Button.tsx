import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "money" | "secondary" | "ghost" | "danger";
  href?: string;
  icon?: React.ReactNode;
  showArrow?: boolean;
  isLoading?: boolean;
  external?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  href,
  icon,
  showArrow = false,
  isLoading = false,
  external = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  let baseStyles =
    "inline-flex items-center justify-center gap-2 font-medium text-xs sm:text-[13px] transition-all duration-150 active:scale-[0.98] select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none";

  let variantStyles = "";

  switch (variant) {
    case "primary":
      variantStyles =
        "bg-white text-black font-semibold px-4 py-2 border border-white hover:bg-neutral-200";
      break;
    case "money":
      variantStyles =
        "bg-emerald-950/30 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40 hover:border-emerald-500/70 px-4 py-2";
      break;
    case "secondary":
      variantStyles =
        "bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.1] text-neutral-300 hover:text-white px-3.5 py-2";
      break;
    case "ghost":
      variantStyles = "text-neutral-400 hover:text-white px-2 py-1 bg-transparent";
      break;
    case "danger":
      variantStyles =
        "bg-rose-950/30 border border-rose-500/40 text-rose-300 hover:bg-rose-900/40 hover:border-rose-500/70 px-3.5 py-2";
      break;
  }

  const content = (
    <>
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent animate-spin shrink-0" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {showArrow && (
        <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
      )}
    </>
  );

  const combinedClass = `${baseStyles} ${variantStyles} group ${className}`;

  if (href) {
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={combinedClass}
        >
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={combinedClass}>
        {content}
      </Link>
    );
  }

  return (
    <button
      disabled={disabled || isLoading}
      className={combinedClass}
      {...props}
    >
      {content}
    </button>
  );
}
