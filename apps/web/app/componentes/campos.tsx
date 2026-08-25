'use client';

/**
 * Peças de interface, na identidade da TRENDI.
 *
 * O que a marca decide aqui: o azul preenche, não escreve; a borda insinua
 * e o brilho marca; e o escuro sobe em azul-noite, nunca em cinza.
 */

export function Campo({
  rotulo,
  ...props
}: { rotulo: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-2">
      <span className="voz-da-marca text-[0.65rem] text-tinta-fraca">{rotulo}</span>
      <input
        {...props}
        className="rounded-lg border border-traco-aceso bg-noite px-3 py-2 outline-none transition focus:border-azul focus:shadow-brilho"
      />
    </label>
  );
}

export function Botao({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="rounded-lg bg-azul px-4 py-2 font-semibold text-branco transition hover:shadow-brilho-forte disabled:opacity-50 disabled:hover:shadow-none"
    >
      {children}
    </button>
  );
}

/**
 * O botão de um lado do duelo.
 *
 * A escolha do Leonardo foi marcar os lados **dentro da paleta**: A veste o
 * azul da marca, B veste o branco. A identidade fica intacta, e a
 * assimetria que isso poderia criar — um lado vestindo a marca e o outro a
 * ausência dela — se compensa no peso: os dois são preenchimento sólido, do
 * mesmo tamanho e da mesma tipografia. Nenhum é contorno.
 */
export function BotaoDoLado({
  lado,
  children,
  ...props
}: { lado: 'a' | 'b' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const veste =
    lado === 'a' ? 'bg-azul text-branco' : 'bg-branco text-preto';
  return (
    <button
      {...props}
      className={`flex-1 rounded-lg px-4 py-3 font-semibold transition hover:shadow-brilho-forte disabled:opacity-50 ${veste}`}
    >
      {children}
    </button>
  );
}

/** Ação secundária: contorno aceso, sem preenchimento. */
export function BotaoVazado({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="rounded-lg border border-traco-aceso px-4 py-2 font-medium text-branco transition hover:border-azul hover:shadow-brilho disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function Erro({ children }: { children: React.ReactNode }) {
  if (children === null || children === undefined) return null;
  return <p className="text-sm text-red-300">{children}</p>;
}

export function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-traco bg-noite px-4 py-3 text-sm text-tinta-fraca">
      {children}
    </p>
  );
}
