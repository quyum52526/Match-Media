import { Card, CardBody, CardTitle } from "@/components/ui/Card";

interface Props {
  isVerified: boolean;
  email: string;
  mobile: string | null;
}

export function AgentStatusCard({ isVerified, email, mobile }: Props) {
  return (
    <div className="space-y-4">
      {/* Verification status */}
      <Card className={isVerified ? "border-success/30 bg-success/[0.03]" : "border-accent/30 bg-accent/[0.03]"}>
        <CardBody className="flex items-start gap-4">
          <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isVerified ? "bg-success/10" : "bg-accent/10"}`}>
            {isVerified ? (
              <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <p className="font-semibold text-ink">
              {isVerified ? "Account Verified" : "Pending Admin Verification"}
            </p>
            <p className="mt-0.5 text-sm text-muted">
              {isVerified
                ? "You are approved to accept verification assignments."
                : "Our team will review your application and verify your identity before activating your account. This usually takes 1–2 business days."}
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Service info */}
      <Card>
        <CardBody className="space-y-4">
          <CardTitle>Agent Account Details</CardTitle>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-card bg-canvas px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Email</p>
              <p className="mt-1 text-sm text-ink">{email}</p>
            </div>
            <div className="rounded-card bg-canvas px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Mobile</p>
              <p className="mt-1 text-sm text-ink">{mobile ?? "Not set"}</p>
            </div>
          </div>

          {/* Service fee breakdown */}
          <div className="rounded-card border border-hairline p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Service Fee Structure</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink/70">Per-assignment fee (client pays)</span>
                <span className="font-semibold text-ink">৳2,500</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/70">MatchMedia platform fee (20%)</span>
                <span className="font-medium text-primary">−৳500</span>
              </div>
              <div className="flex justify-between border-t border-hairline pt-2">
                <span className="font-semibold text-ink">Your earnings per assignment</span>
                <span className="font-bold text-success">৳2,000</span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <p className="text-xs text-muted">
        To update your contact details or dispute an assignment, please contact{" "}
        <a href="mailto:support@matchmedia.com.bd" className="text-primary underline-offset-2 hover:underline">
          support@matchmedia.com.bd
        </a>.
      </p>
    </div>
  );
}
