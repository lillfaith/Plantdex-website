import { notFound } from 'next/navigation';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { HabitatsPreview } from '@/components/habitats-preview/HabitatsPreview';

/** DEVELOPMENT PREVIEW (owner review only). 404 unless NEXT_PUBLIC_HABITATS_PREVIEW=on at build time. */
export default function HabitatsPreviewPage() {
  if (process.env.NEXT_PUBLIC_HABITATS_PREVIEW !== 'on') notFound();
  return (
    <>
      <PageAtmosphere theme="collection" />
      <HabitatsPreview />
    </>
  );
}
