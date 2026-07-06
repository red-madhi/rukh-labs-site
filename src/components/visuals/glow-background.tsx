export function GlowBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#05070b]" />
      <div className="absolute left-1/2 top-[-22rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[#0f3760]/28 blur-3xl" />
      <div className="absolute right-[-16rem] top-1/3 h-[34rem] w-[34rem] rounded-full bg-[#d6ad5b]/10 blur-3xl" />
      <div className="absolute bottom-[-20rem] left-[-12rem] h-[36rem] w-[36rem] rounded-full bg-[#4db7ff]/12 blur-3xl" />
      <div className="global-grid absolute inset-0 opacity-[0.34]" />
      <div className="global-noise absolute inset-0 opacity-[0.045]" />
    </div>
  );
}
