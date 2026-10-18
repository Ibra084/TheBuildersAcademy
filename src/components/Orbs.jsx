// Soft blurred colour orbs that drift slowly behind a section. Decorative only;
// the parent needs `relative overflow-hidden`.
export default function Orbs() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="orb orb-a bg-accent/20 w-[520px] h-[520px] -top-40 -left-32" />
      <div className="orb orb-b bg-accent/15 w-[440px] h-[440px] top-1/3 -right-40" />
      <div className="orb orb-c bg-blue-300/25 w-[380px] h-[380px] -bottom-40 left-1/4" />
    </div>
  )
}
