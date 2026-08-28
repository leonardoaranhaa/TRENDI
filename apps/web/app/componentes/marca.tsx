import Image from 'next/image';
import Link from 'next/link';

/**
 * O logotipo da TRENDI.
 *
 * O lettering é desenhado à mão — não é fonte, e por isso não dá para
 * compor com CSS. Sai daqui como imagem, num componente só, para o dia em
 * que o vetor chegar ser a troca de um arquivo.
 *
 * ⚠️ O arquivo atual foi **extraído do quadro de identidade**, em 615px de
 * largura. Serve para tela; não serve para impressão nem para ampliar. O
 * SVG original resolve as duas coisas.
 */

const PROPORCAO = 615 / 285;

export function Marca({
  altura = 40,
  comBrilho = true,
}: {
  readonly altura?: number;
  readonly comBrilho?: boolean;
}) {
  return (
    <Image
      src="/marca/trendi.png"
      alt="TRENDI"
      width={Math.round(altura * PROPORCAO)}
      height={altura}
      priority
      className={comBrilho ? 'drop-shadow-[0_0_18px_rgba(1,50,255,0.65)]' : undefined}
    />
  );
}

/** O logotipo levando de volta para a home. */
export function MarcaLink({ altura = 32 }: { readonly altura?: number }) {
  return (
    <Link href="/" aria-label="TRENDI — início" className="w-fit">
      <Marca altura={altura} />
    </Link>
  );
}

/**
 * A assinatura da marca. Fica sob o logotipo, em caixa alta e entreletra
 * larga, com as duas palavras que a marca destaca em azul.
 */
export function Assinatura({ className = '' }: { readonly className?: string }) {
  return (
    <p className={`voz-da-marca text-[0.7rem] text-tinta-fraca ${className}`}>
      Tendências que <span className="text-eletrico">movem</span>. Estilo que{' '}
      <span className="text-eletrico">fica</span>.
    </p>
  );
}
