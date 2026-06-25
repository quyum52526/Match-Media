import { setRequestLocale } from "next-intl/server";
import { PhotoModerationQueue } from "@/components/admin/PhotoModerationQueue";
import { getPendingPhotos } from "@/lib/data/admin";

export default async function AdminPhotosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const photos = await getPendingPhotos();
  return <PhotoModerationQueue photos={photos} />;
}
