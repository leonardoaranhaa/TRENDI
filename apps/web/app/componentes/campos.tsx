'use client';

/** Peças de formulário usadas nas telas de conta. */

export function Campo({
  rotulo,
  ...props
}: { rotulo: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm text-neutral-400">{rotulo}</span>
      <input
        {...props}
        className="rounded-lg border border-neutral-800 bg-transparent px-3 py-2 outline-none focus:border-neutral-600"
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
      className="rounded-lg bg-neutral-100 px-4 py-2 font-medium text-neutral-950 transition hover:bg-white disabled:opacity-50"
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
    <p className="rounded-lg border border-neutral-800 px-4 py-3 text-sm text-neutral-400">
      {children}
    </p>
  );
}
