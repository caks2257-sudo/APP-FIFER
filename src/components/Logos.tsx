export default function Logos() {
  const labels = ['Liga Regional', 'Club Pro', 'Media Norte', 'Sponsor X'];
  return (
    <div className="flex flex-wrap items-center justify-center gap-8 py-8 mb-4 border-y border-[#1F2937]">
      {labels.map((name) => (
        <span key={name} className="text-sm font-medium text-[#6B7280]">
          {name}
        </span>
      ))}
    </div>
  );
}
