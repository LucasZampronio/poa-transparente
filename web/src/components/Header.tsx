export default function Header() {
  return (
    <header className="bg-white border-b border-border mb-6">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">POA Transparente</h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">
            Acompanhamento real da execucao orcamentaria de Porto Alegre
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
            Dados Oficiais
          </span>
          <span className="text-xs text-slate-400 font-mono">v2.0 Tailwind</span>
        </div>
      </div>
    </header>
  );
}
