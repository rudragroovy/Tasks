import { getAllSpecies } from '@/lib/db';
import Link from 'next/link';
import FilterForm from '@/components/FilterForm';
import FilterPills from '@/components/FilterPills';

function getBroadCategory(s: any): string {
  const kingdom = s.taxonomyParsed?.kingdom;
  if (kingdom === 'Plantae') return 'Plants';

  const cls = s.taxonomyParsed?.class_name;
  if (cls) {
    if (cls === 'Mammalia') return 'Mammals';
    if (cls === 'Aves') return 'Birds';
    if (cls === 'Reptilia') return 'Reptiles';
    if (cls === 'Amphibia') return 'Amphibians';
    if (['Actinopterygii', 'Chondrichthyes', 'Sarcopterygii', 'Elasmobranchii'].includes(cls)) return 'Fish';
    if (['Insecta', 'Arachnida', 'Malacostraca', 'Gastropoda', 'Cephalopoda', 'Bivalvia'].includes(cls)) return 'Invertebrates';
  }

  // Fallback based on order since class is sometimes null
  const order = s.taxonomyParsed?.order;
  if (order) {
    const mammals = ['Carnivora', 'Monotremata', 'Proboscidea', 'Cetacea', 'Diprotodontia', 'Primates', 'Rodentia', 'Chiroptera', 'Artiodactyla'];
    if (mammals.includes(order)) return 'Mammals';

    const birds = ['Sphenisciformes', 'Falconiformes', 'Phoenicopteriformes', 'Galliformes', 'Accipitriformes', 'Struthioniformes', 'Psittaciformes', 'Coraciiformes', 'Gaviiformes', 'Strigiformes', 'Passeriformes', 'Anseriformes'];
    if (birds.includes(order)) return 'Birds';

    const reptiles = ['Testudinidae', 'Alligatoridae', 'Dermochelyidae', 'Varanidae', 'Elapidae', 'Sphenodontidae', 'Iguanidae', 'Chamaeleonidae', 'Boidae', 'Crocodylidae', 'Squamata'];
    if (reptiles.includes(order)) return 'Reptiles';

    const fish = ['Tetraodontiformes', 'Orectolobiformes', 'Syngnathiformes', 'Salmoniformes', 'Lamniformes', 'Perciformes', 'Coelacanthiformes', 'Scorpaeniformes'];
    if (fish.includes(order)) return 'Fish';

    const invertebrates = ['Lepidoptera', 'Coleoptera', 'Mantodea', 'Hymenoptera', 'Araneae'];
    if (invertebrates.includes(order)) return 'Invertebrates';
  }

  return 'Other';
}

export default async function Home({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await searchParams;
  const q = typeof resolvedParams.q === 'string' ? resolvedParams.q.toLowerCase() : '';
  const typeFilter = typeof resolvedParams.type === 'string' ? resolvedParams.type : '';
  const statusFilter = typeof resolvedParams.status === 'string' ? resolvedParams.status : '';
  const trendFilter = typeof resolvedParams.trend === 'string' ? resolvedParams.trend : '';
  const weightFilter = typeof resolvedParams.weight === 'string' ? resolvedParams.weight : '';
  const dietFilter = typeof resolvedParams.diet === 'string' ? resolvedParams.diet : '';
  const limitParam = typeof resolvedParams.limit === 'string' ? parseInt(resolvedParams.limit, 10) : 24;
  const limit = isNaN(limitParam) ? 24 : limitParam;

  let speciesList = getAllSpecies().map(s => {
    const taxonomyParsed = JSON.parse(s.taxonomy || '{}');
    return {
      ...s,
      taxonomyParsed,
      broadCategory: getBroadCategory({ taxonomyParsed })
    };
  });

  // Apply filters
  if (typeFilter && typeFilter !== 'All') {
    speciesList = speciesList.filter(s => s.broadCategory === typeFilter);
  }
  if (statusFilter) {
    speciesList = speciesList.filter(s => s.conservation_status === statusFilter);
  }
  if (trendFilter) {
    speciesList = speciesList.filter(s => s.population_trend === trendFilter);
  }
  if (weightFilter) {
    speciesList = speciesList.filter(s => {
      const w = parseFloat(s.weight_kg);
      if (isNaN(w)) return false;
      if (weightFilter === 'light') return w < 10;
      if (weightFilter === 'medium') return w >= 10 && w <= 100;
      if (weightFilter === 'heavy') return w > 100;
      return true;
    });
  }
  if (dietFilter) {
    speciesList = speciesList.filter(s => {
      if (!s.diet_type) return false;
      return s.diet_type.toLowerCase().includes(dietFilter.toLowerCase());
    });
  }
  if (q) {
    speciesList = speciesList.filter(s =>
      s.scientific_name.toLowerCase().includes(q) ||
      (s.common_names && s.common_names.toLowerCase().includes(q))
    );
  }
  const totalCount = speciesList.length;

  const isFeatured = !q && (!typeFilter || typeFilter === 'All');
  if (isFeatured) {
    // For featured entities, we just select a top 8 slice of highly recognizable or fully populated data.
    speciesList = speciesList.slice(0, 8);
  } else {
    // Paginate search results
    speciesList = speciesList.slice(0, limit);
  }

  const hasMore = !isFeatured && totalCount > limit;

  const categoryPills = ['All', 'Mammals', 'Birds', 'Reptiles', 'Amphibians', 'Fish', 'Invertebrates', 'Plants'];

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#E5E7EB] shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-[24px] font-black tracking-tight text-[#1A1A1A] drop-shadow-sm">WildLife Directory</div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="pt-32 pb-16 px-6 max-w-7xl mx-auto">

        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-[56px] font-black text-[#1A1A1A] mb-4 leading-tight tracking-tight">
            Explore Earth's <br /> Incredible Biodiversity
          </h1>
          <p className="text-[24px] text-[#0F766E] font-medium mb-3">
            A Premium Digital Encyclopedia
          </p>
          <p className="text-[16px] text-[#6B7280] max-w-2xl mx-auto">
            Browse structured, pipeline-verified data on species spanning from the deepest oceans to the highest canopies.
          </p>
        </div>

        {/* Search & Broad Filters Container */}
        <div className="mb-16 flex flex-col items-center">
          <FilterForm>
            {/* Huge Search Bar */}
            <div className="w-full max-w-3xl mb-8">
              <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-full p-2 flex items-center gap-3 shadow-sm transition-all focus-within:shadow-md focus-within:border-[#D1D5DB]/40">
                <svg className="w-6 h-6 ml-6 text-[#1A1A1A]/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Search species by common or scientific name..."
                  className="flex-1 bg-transparent px-2 py-3 text-lg text-current placeholder:text-current/60 outline-none border-none border-0 ring-0 shadow-none focus:outline-none focus:ring-0 rounded-full"
                />
              </div>
            </div>

            {/* Horizontal Filter Pills */}
            <FilterPills 
              currentFilter={typeFilter} 
              currentStatus={statusFilter} 
              currentTrend={trendFilter}
              currentWeight={weightFilter}
              currentDiet={dietFilter}
            />
          </FilterForm>
        </div>

        {/* Statistics */}
        {!q && !typeFilter && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16 max-w-4xl mx-auto">
            <div className="bento-card text-center p-8 flex flex-col justify-center">
              <div className="text-[40px] font-black text-[#0F766E] leading-none mb-2">{totalCount}</div>
              <div className="text-[14px] font-bold uppercase tracking-widest text-[#6B7280]">Entities Indexed</div>
            </div>
            <div className="bento-card text-center p-8 flex flex-col justify-center">
              <div className="text-[40px] font-black text-[#0F766E] leading-none mb-2">{categoryPills.length - 1}</div>
              <div className="text-[14px] font-bold uppercase tracking-widest text-[#6B7280]">Categories</div>
            </div>
          </div>
        )}

        {/* Grid Title */}
        <div className="mb-6 text-[#1A1A1A] font-bold text-[24px] flex justify-between items-center px-2">
          <h2>{q || typeFilter ? `Search Results (${totalCount})` : 'Featured Entities'}</h2>
        </div>

        {speciesList.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center bg-[#F1F5F2] rounded-[20px] border border-[#E5E7EB] shadow-sm mt-8">
            <svg className="w-24 h-24 text-[#0F766E]/40 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <h3 className="text-[24px] font-black text-[#1A1A1A] mb-2">No records found</h3>
            <p className="text-[16px] text-[#6B7280] max-w-md">We couldn't find any species matching your criteria in the database. Try adjusting your search term or clearing the active filters.</p>
            <Link href="/" className="mt-8 px-6 py-2 bg-[#1B5E4A] text-[#FFFFFF] rounded-full font-bold shadow-md hover:scale-105 transition-transform">Clear Filters</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {speciesList.map((species) => {
              const names = JSON.parse(species.common_names || '[]');
              const commonName = names.length > 0 ? names[0] : species.scientific_name;
              const images = JSON.parse(species.image_urls || '[]');
              const primaryImage = images.length > 0 ? images[0] : 'https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&q=80';

              return (
                <Link href={`/species/${species.id}`} key={species.id} className="group bento-card p-0 overflow-hidden flex flex-col h-[340px]">
                  <div className="h-48 shrink-0 relative bg-[#F8FAF8] overflow-hidden">
                    <img src={primaryImage} alt={commonName} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500 ease-out" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div className="p-6 flex flex-col flex-1 min-h-0 bg-transparent">
                    <h2 className="text-xl font-black mb-1 truncate">{commonName}</h2>
                    <p className="opacity-70 text-sm italic mb-4 truncate font-medium">{species.scientific_name}</p>
                    <div className="mt-auto flex flex-wrap gap-2 overflow-hidden max-h-[60px]">
                      {species.broadCategory && species.broadCategory !== 'Unknown' && (
                        <span className="glass-pill">
                          {species.broadCategory}
                        </span>
                      )}
                      {species.conservation_status && (
                        <span className="glass-pill opacity-90 border-l-2 border-l-[#16A34A]">
                          {species.conservation_status}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && (
          <div className="mt-12 flex justify-center">
            <Link
              href={`/?q=${encodeURIComponent(q)}&type=${encodeURIComponent(typeFilter)}&limit=${limit + 24}`}
              scroll={false}
              className="px-8 py-3 bg-[#FFFFFF] border border-[#E5E7EB] text-[#1A1A1A] font-bold rounded-full shadow-sm hover:shadow-md hover:bg-[#EAF4EF] hover:-translate-y-1 transition-all"
            >
              Load More Results
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
