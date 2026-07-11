import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils";
import { AuthBackground } from "./AuthBackground";

interface AuthShellProps {
  /** Page heading, centered above the card. */
  title: string;
  /** Optional supporting line under the title. */
  subtitle?: string;
  /** The form (or any content) rendered inside the card. */
  children: ReactNode;
  /** Optional footer line under the card (e.g. "Already have an account? Log in"). */
  footer?: ReactNode;
  /** Optional per-page brand background image. Defaults to match-media-bg-01. */
  bgImage?: string;
}

/**
 * Shared shell for the standalone auth forms (Log in, Create account).
 *
 * Single source of truth for the auth-card width, vertical centering, and
 * title/subtitle/footer layout — change the width here and every auth page
 * updates together. Width is 100% on mobile (inside Container's px-4 rail)
 * and caps at max-w-lg on desktop.
 *
 * Background: brand line-art (match-media-bg-01.svg, drawn at ~10% opacity)
 * over an ivory canvas base, softened by a gradient wash so it stays a
 * whisper-quiet texture. The form sits on a frosted off-white card so text
 * remains perfectly legible regardless of what's behind it.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  bgImage,
}: AuthShellProps) {
  return (
    <AuthBackground bgImage={bgImage}>
      <Container className="flex min-h-screen flex-col justify-center py-10">
        <div className="mx-auto w-full max-w-lg">
          <h1
            className={cn(
              "text-center text-2xl font-bold text-ink",
              !subtitle && "mb-6",
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mb-6 mt-2 text-center text-sm text-ink/60">{subtitle}</p>
          )}
          {/* Frosted card — semi-transparent off-white over the art keeps text crisp. */}
          <div className="rounded-card border border-white/60 bg-white/85 p-5 shadow-card backdrop-blur-md sm:p-8">
            {children}
          </div>
          {footer && (
            <p className="mt-4 text-center text-sm text-ink/70">{footer}</p>
          )}
        </div>
      </Container>
    </AuthBackground>
  );
}
