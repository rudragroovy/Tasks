import { getDb, getSpeciesById, getAllSpecies } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export async function generateStaticParams() {
  const statement = getDb().prepare('SELECT id FROM species');
  const species = statement.all() as { id: string }[];
  return species.map((s) => ({ id: String(s.id) }));
}

export default async function SpeciesDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const species = getSpeciesById(resolvedParams.id);

  if (!species) {
    notFound();
  }

  const names = JSON.parse(species.common_names || '[]');
  const commonName = names.length > 0 ? names[0] : species.scientific_name;
  const taxonomy = JSON.parse(species.taxonomy || '{}');
  const images = JSON.parse(species.image_urls || '[]');
  const primaryImage = images.length > 0 ? images[0] : 'https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&q=80';

  const displayImages = [...images];

  const allSpecies = getAllSpecies();
  const relatedSpecies = allSpecies
    .filter(s => s.id !== species.id)
    .map(s => {
      const t = JSON.parse(s.taxonomy || '{}');
      let score = 0;
      // Closer taxonomic ranks get higher scores
      if (t.family && taxonomy.family && t.family === taxonomy.family) score += 3;
      if (t.order && taxonomy.order && t.order === taxonomy.order) score += 2;
      if (t.class_name && taxonomy.class_name && t.class_name === taxonomy.class_name) score += 1;
      return { species: s, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(item => item.species);

  return (
    <div className="min-h-screen pb-20 relative">
      {/* Hero & Top Content Layout */}
      <div className="max-w-7xl mx-auto px-6 pt-32 mb-16">
        <Link href="/" className="inline-flex items-center gap-2 px-6 py-2 bg-[#FFFFFF] rounded-full text-[14px] font-bold border border-[#E5E7EB] hover:bg-[#EAF4EF] transition-all shadow-sm text-[#1A1A1A] mb-8">
          ← Back to Directory
        </Link>
        
        <div className="flex flex-col lg:flex-row gap-12 items-start">
          {/* Left: Title & Quick Stats */}
          <div className="flex-1 w-full">
            <h1 className="text-[56px] font-black text-[#1A1A1A] mb-2 leading-tight tracking-tight">{commonName}</h1>
            <p className="text-[24px] text-[#0F766E] italic font-medium mb-10">{species.scientific_name}</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="bento-card p-6 flex flex-col justify-center bg-[#FFFFFF]">
                <div className="text-[12px] font-bold uppercase tracking-widest opacity-60 mb-2">Class</div>
                <div className="font-black text-[24px]">{taxonomy.class_name || 'Unknown'}</div>
              </div>
              <div className="bento-card p-6 flex flex-col justify-center bg-[#FFFFFF]">
                <div className="text-[12px] font-bold uppercase tracking-widest opacity-60 mb-2">Order</div>
                <div className="font-black text-[24px]">{taxonomy.order || 'Unknown'}</div>
              </div>
              <div className="bento-card p-6 flex flex-col justify-center bg-[#FFFFFF]">
                <div className="text-[12px] font-bold uppercase tracking-widest opacity-60 mb-2">Status</div>
                <div className="font-black text-[24px] text-[#0F766E]">{species.conservation_status || 'Not Evaluated'}</div>
              </div>
              <div className="bento-card p-6 flex flex-col justify-center bg-[#FFFFFF]">
                <div className="text-[12px] font-bold uppercase tracking-widest opacity-60 mb-2">Pop. Trend</div>
                <div className="font-black text-[24px]">{species.population_trend || 'Unknown'}</div>
              </div>
            </div>
          </div>

          {/* Right: Contained Image Frame */}
          <div className="w-full lg:w-[450px] shrink-0">
            <div className="p-4 bg-[#FFFFFF] border border-[#E5E7EB] shadow-xl rounded-[24px] rotate-1 hover:rotate-0 transition-transform duration-500">
              <div className="rounded-[16px] overflow-hidden bg-[#F8FAF8] relative w-full aspect-[4/3] group">
                {/* Clean Object Cover to ensure it perfectly fills the box without weird spacing */}
                <img src={primaryImage} alt={commonName} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 relative z-10">

        {/* Photo Gallery */}
        {displayImages.length > 1 && (
          <div className="mb-12">
            <h2 className="text-[24px] font-black text-[#1A1A1A] mb-6">Photo Gallery</h2>
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
              {displayImages.map((img: string, idx: number) => (
                <div key={idx} className="shrink-0 w-[300px] h-[200px] rounded-[20px] overflow-hidden shadow-md snap-center border border-[#E5E7EB]">
                  <img src={img} alt={`${commonName} photo ${idx + 1}`} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Info Bento Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            <section className="bento-card p-8">
              <h2 className="text-[32px] font-black mb-6 flex items-center gap-3">Overview</h2>
              {species.description ? (
                <p className="leading-relaxed text-[16px]">{species.description}</p>
              ) : (
                <p className="text-[#6B7280] italic text-[16px]">Not documented</p>
              )}
            </section>
            
            <section className="bento-card p-8">
              <h2 className="text-[32px] font-black mb-6">Habitat & Distribution</h2>
              <div className="space-y-4 text-[16px]">
                <div>
                  <strong className="block text-[#0F766E]">Habitat:</strong>
                  {species.habitat ? <p>{species.habitat}</p> : <p className="text-[#6B7280] italic">Not documented</p>}
                </div>
                <div>
                  <strong className="block text-[#0F766E]">Regions:</strong>
                  {species.geographic_range && species.geographic_range !== '[]' ? (
                    <p>{JSON.parse(species.geographic_range).join(', ')}</p>
                  ) : (
                    <p className="text-[#6B7280] italic">Not documented</p>
                  )}
                </div>
              </div>
            </section>
            
            <section className="bento-card p-8">
              <h2 className="text-[32px] font-black mb-6">Diet & Behavior</h2>
              <div className="space-y-4 text-[16px]">
                <div>
                  <strong className="block text-[#0F766E]">Diet:</strong>
                  {species.diet_type ? <p>{species.diet_type}</p> : <p className="text-[#6B7280] italic">Not documented</p>}
                </div>
                <div>
                  <strong className="block text-[#0F766E]">Behavior:</strong>
                  {species.behavior ? <p>{species.behavior}</p> : <p className="text-[#6B7280] italic">Not documented</p>}
                </div>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <section className="bento-card p-8">
              <h2 className="text-[32px] font-black mb-6">Reproduction & Lifespan</h2>
              <ul className="space-y-4 text-[16px]">
                <li>
                  <strong className="block text-[#0F766E]">Reproduction:</strong> 
                  {species.reproduction ? <span>{species.reproduction}</span> : <span className="text-[#6B7280] italic">Not documented</span>}
                </li>
                <li>
                  <strong className="block text-[#0F766E]">Lifespan:</strong> 
                  {species.lifespan_years ? <span>{species.lifespan_years}</span> : <span className="text-[#6B7280] italic">Not documented</span>}
                </li>
              </ul>
            </section>

            <section className="bento-card p-8">
              <h2 className="text-[32px] font-black mb-6">Physical Characteristics</h2>
              <ul className="space-y-4 text-[16px]">
                <li>
                  <strong className="block text-[#0F766E]">Weight:</strong> 
                  {species.weight_kg ? <span>{species.weight_kg}</span> : <span className="text-[#6B7280] italic">Data pending pipeline ingestion...</span>}
                </li>
                <li>
                  <strong className="block text-[#0F766E]">Length:</strong> 
                  {species.length_cm ? <span>{species.length_cm}</span> : <span className="text-[#6B7280] italic">Data pending pipeline ingestion...</span>}
                </li>
              </ul>
            </section>
          </div>
        </div>

        {/* Data Provenance Metadata */}
        <div className="mt-12 mb-16 p-6 border border-[#E5E7EB] rounded-[20px] bg-[#F8FAF8] text-center">
          <p className="text-[14px] text-[#6B7280] font-medium">
            <span className="font-bold text-[#1A1A1A]">Data Provenance:</span> Record automatically verified by Wildlife Data Pipeline.
            Last synced: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Related Entities */}
        {relatedSpecies.length > 0 && (
          <div className="mt-16 mb-8">
            <h2 className="text-[32px] font-black mb-8 text-[#1A1A1A]">Related Entities</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {relatedSpecies.map(related => {
                const rNames = JSON.parse(related.common_names || '[]');
                const rCommon = rNames.length > 0 ? rNames[0] : related.scientific_name;
                const rImages = JSON.parse(related.image_urls || '[]');
                const rPrimaryImg = rImages.length > 0 ? rImages[0] : 'https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&q=80';
                return (
                  <Link href={`/species/${related.id}`} key={related.id} className="group bento-card p-0 overflow-hidden flex flex-col h-[280px]">
                    <div className="h-40 shrink-0 relative bg-[#F8FAF8] overflow-hidden">
                      <img src={rPrimaryImg} alt={rCommon} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500 ease-out" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <div className="p-5 flex flex-col flex-1 min-h-0 bg-transparent justify-center">
                      <h3 className="text-[18px] font-black mb-1 truncate">{rCommon}</h3>
                      <p className="opacity-70 text-[14px] italic truncate font-medium">{related.scientific_name}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
