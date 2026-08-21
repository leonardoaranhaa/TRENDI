/**
 * Tradução dos erros da API para o que a pessoa lê na tela.
 *
 * Tom Gen Z, sem formalidade (02-arquitetura/convencoes.md), e sem nunca
 * dizer se a conta existe: isso vale tanto para o login quanto para a
 * recuperação de senha.
 */
export const MENSAGENS: Record<string, string> = {
  // senha
  muito_curta: 'Senha curta demais: mínimo de 10 caracteres.',
  muito_longa: 'Senha longa demais.',
  obvia: 'Essa senha é das mais tentadas do mundo. Escolhe outra.',
  igual_ao_email: 'A senha não pode ser o seu e-mail.',
  senha_invalida: 'Senha inválida.',
  senha_ja_existe: 'Essa conta já tem senha.',

  // handle
  caracteres_invalidos: 'Use só letras minúsculas, números e _.',
  reservado: 'Esse nome é reservado pela plataforma.',
  handle_em_uso: 'Alguém já está usando esse nome.',
  handle_invalido: 'Esse nome não serve.',

  // conta
  email_invalido: 'Esse e-mail não parece certo.',
  email_em_uso: 'Já existe conta com esse e-mail. Tenta entrar.',
  credenciais_invalidas: 'E-mail ou senha não conferem.',
  token_invalido: 'Esse link não vale mais. Peça outro.',
  sem_sessao: 'Sua sessão expirou. Entra de novo.',
  sem_email: 'Sua conta não tem e-mail cadastrado.',
};

/** A frase certa para um corpo de erro da API. */
export function mensagemDoErro(corpo: { error?: string; problema?: string } | null): string {
  if (corpo === null) return 'Não deu para completar agora. Tenta de novo.';
  const chave = corpo.problema ?? corpo.error ?? '';
  return MENSAGENS[chave] ?? 'Não deu para completar agora. Tenta de novo.';
}

/** Lê o corpo sem quebrar quando a resposta não é JSON. */
export async function corpoDoErro(response: Response): Promise<{ error?: string; problema?: string } | null> {
  try {
    return (await response.json()) as { error?: string; problema?: string };
  } catch {
    return null;
  }
}
