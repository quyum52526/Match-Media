import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const metadata = {
  title: "Set up your profile · MatchMedia",
};

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-canvas">
      <OnboardingWizard />
    </main>
  );
}
