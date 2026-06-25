import { prisma } from "@/lib/prisma";
import { getViewerId } from "@/lib/session";
import { CallProvider } from "./CallProvider";

/**
 * Server wrapper that resolves the signed-in viewer (id + display name) and
 * mounts the client CallProvider around the app, so incoming calls can ring
 * anywhere. Signed-out visitors get a no-op provider (viewerId = null).
 */
export async function CallProviderMount({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewerId = await getViewerId();
  let viewerName = "";
  if (viewerId) {
    const user = await prisma.user.findUnique({
      where: { id: viewerId },
      select: { email: true, profile: { select: { fullName: true } } },
    });
    viewerName = user?.profile?.fullName?.trim() || user?.email || "";
  }

  return (
    <CallProvider viewerId={viewerId} viewerName={viewerName}>
      {children}
    </CallProvider>
  );
}
