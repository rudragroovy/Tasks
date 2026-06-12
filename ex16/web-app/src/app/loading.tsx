export default function Loading() {
  return (
    <div className="min-h-screen pt-32 pb-16 px-6 max-w-7xl mx-auto animate-pulse flex flex-col items-center">
      <div className="h-[56px] w-[60%] bg-[#E5E7EB] rounded-xl mb-4"></div>
      <div className="h-[24px] w-[40%] bg-[#E5E7EB] rounded-xl mb-12"></div>
      <div className="h-[60px] w-full max-w-3xl bg-[#E5E7EB] rounded-full mb-8"></div>
      <div className="flex gap-3 mb-16">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-[40px] w-[100px] bg-[#E5E7EB] rounded-full"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-[340px] bg-[#E5E7EB] rounded-[20px]"></div>
        ))}
      </div>
    </div>
  );
}
