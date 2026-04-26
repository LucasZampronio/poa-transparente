export default function Header() {
  return (
    <header className="bg-white border-b border-border mb-4 md:mb-6">
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">POA Transparente</h1>
          <p className="text-slate-500 mt-0.5 md:mt-1 text-xs md:text-base">
            Execução orçamentária de Porto Alegre
          </p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium bg-green-100 text-green-800 border border-green-200">
            Dados Oficiais
          </span>
          <span className="text-[10px] md:text-xs text-slate-400 font-mono">v2.1 Mobile</span>
        </div>
      </div>
    </header>
  );
}
