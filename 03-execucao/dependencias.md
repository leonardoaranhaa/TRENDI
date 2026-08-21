# DEPENDÊNCIAS — O que trava o quê

Este arquivo existe por um motivo: em projeto solo, o gargalo quase nunca é código. É uma tarefa do mundo real que demora semanas e que você descobriu tarde demais.

**Regra:** olhe aqui antes de sentar para codar. Se a tarefa `[C]` que você quer fazer depende de uma `[L]` aberta, resolva a `[L]` primeiro ou escolha outra `[C]`.

---

## CADEIA CRÍTICA

```
L-03 (fornecedor de vídeo) ✅ Amazon IVS, decisão D-20
  └─→ C-03 (SDK) ✅
        └─→ C-04 (captação WebRTC)
              └─→ C-05 (composição split-screen)
                    ├─→ C-06 (sala de duelo)
                    └─→ C-21 (clipes)
                          └─→ C-29 (clipes premium)
```

**Era o bloqueio mais pesado do projeto, e caiu.** A conta AWS (`L-19`) ainda não existe, mas não trava: como no login, o código roda contra um fornecedor falso até a credencial chegar.

```
L-02 (parecer jurídico)
  ├─→ L-08 (serviço de idade) ──→ C-24 (estimativa de idade)
  ├─→ L-11 (música licenciada) ─→ C-32 (biblioteca na interface)
  ├─→ L-13 (termos e privacidade)
  ├─→ C-28 (assinatura)
  ├─→ C-30 (presentes)
  └─→ L-16 (prêmio em dinheiro)
```

**L-02 demora.** Advogado não responde em 24h. Começar cedo mesmo que pareça prematuro.

```
L-05 (CNPJ)
  ├─→ L-12 (gateway de pagamento)
  │     └─→ C-33 (revenue share)
  ├─→ L-14 (DPO)
  └─→ C-28, C-29 (qualquer coisa que receba dinheiro)
```

```
L-01 (nome)
  ├─→ L-05 (CNPJ)
  └─→ identidade visual, domínio, redes
```

```
L-18 (provedor de e-mail)
  └─→ verificação de e-mail e recuperação de senha chegarem à caixa de entrada
        (C-37 já funciona; fora de produção o link volta na resposta da API)
```

```
L-17 (apps OAuth registrados)
  └─→ entrar com conta real (C-02 já roda com provedor falso)
        └─→ C-36 (publicar o protótipo)
```

```
L-06 (regras da plataforma) ✅ três regras de conduta, decisão D-21
  ├─→ C-10 (desafio da fase 1) ← desbloqueada
  ├─→ C-20 (catálogo fase 2)
  └─→ C-26 (catálogo completo)
```

O catálogo continua crescendo, mas deixou de ser bloqueio: **a plataforma faz cumprir três regras de conduta, não dez regulamentos de desafio.** Quem julga execução é a arquibancada.

---

## O QUE PODE ANDAR EM PARALELO SEM BLOQUEIO

Se você quiser codar hoje e nenhum `[L]` estiver resolvido, estas tarefas não dependem de nada externo:

- ~~**C-01** montar repositório e stack~~ ✅
- ~~**C-02** identidade e login~~ ✅ (entra de verdade só com L-17)
- ~~**C-07** chat por WebSocket~~ ✅
- ~~**C-08** máquina de estados do duelo~~ ✅
- ~~**C-09** votação simples~~ ✅
- **C-14** fórmula do voto cruzado — 🟡 a fórmula está pronta e testada; falta plugar em C-09 e C-12

**Sequência executada:** C-01 → C-08 → C-14 (fórmula) → C-02 → C-37 → C-07 → C-09. O coração lógico está de pé: identidade, chat, ciclo do duelo e voto.

**A fila voltou a andar em 2026-08-20**, quando L-03 e L-06 saíram. O caminho de código da Fase 1 é agora:

~~C-03~~ ✅ → **C-04** → C-05 → C-06, e `C-10` em paralelo.

O que ainda espera você, sem travar código nenhum:

| Tarefa | O que só acontece depois dela |
|---|---|
| **L-19** | Vídeo de verdade (até lá, fornecedor falso) |
| **L-17** | Entrar por Google e Discord (a conta nativa já funciona) |
| **L-18** | Link de e-mail chegar à caixa de entrada |
| **L-04** | Saber se o custo por espectador-hora fecha — a entrega é 97% da conta |

A Fase 2 continua tendo tarefas tecnicamente livres (C-11 → C-12 → C-14 completa), e continua valendo o roadmap: construir Fase 2 durante a Fase 1 é como projeto solo não lança.

---

## ARMADILHAS CONHECIDAS

| Armadilha | Consequência |
|---|---|
| Escolher fornecedor de vídeo depois de escrever código de vídeo | Retrabalho da camada inteira — evitado: D-20 veio antes de C-03 |
| Implementar monetização antes do parecer jurídico | Risco regulatório e possível refatoração |
| Coletar biometria antes de L-02 | Exposição jurídica séria — categoria mais sensível do projeto |
| Construir ranking antes de validar o formato (Fase 1) | Trabalho perdido se o formato não engajar |
| Deixar moderação para depois com chats expostos | Primeiro duelo tóxico queima a reputação |
| Descobrir tarde que app OAuth leva dias para aprovar | Ninguém entra na plataforma no dia do teste com criador |
