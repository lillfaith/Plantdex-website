import { notFound } from 'next/navigation';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { PlantCoreProtoHost } from '@/components/ui/PlantCoreProtoHost';

/** PROTOTYPE (owner review only): 404 unless NEXT_PUBLIC_PLANT_CORE_PROTO=on at build time. */
export default function Page() {
  if (process.env.NEXT_PUBLIC_PLANT_CORE_PROTO !== 'on') notFound();
  return (
    <>
      <PageAtmosphere theme="home" />
      <PlantCoreProtoHost variant="quick" />
    </>
  );
}
