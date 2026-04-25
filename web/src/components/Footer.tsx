export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <p className="text-slate-500 text-sm">
              &copy; {currentYear} <span className="font-bold text-slate-700">POA Transparente</span>. 
              Projeto de transparencia publica municipal.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 text-xs font-medium text-slate-400 uppercase tracking-widest">
            <span className="text-slate-300">Fontes Oficiais:</span>
            <a href="https://dadosabertos.poa.br" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">
              DataPoa
            </a>
            <span className="hidden md:block text-slate-200">|</span>
            <a href="https://portaldatransparencia.gov.br" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">
              Portal da Transparencia
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
