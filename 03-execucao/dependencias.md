# DEPENDÊNCIAS — O que trava o quê

Este arquivo existe por um motivo: em projeto solo, o gargalo quase nunca é código. É uma tarefa do mundo real que demora semanas e que você descobriu tarde demais.

**Regra:** olhe aqui antes de sentar para codar. Se a tarefa `[C]` que você quer fazer depende de uma `[L]` aberta, resolva a `[L]` primeiro ou escolha outra `[C]`.

---

## CADEIA CRÍTICA

```
L-03 (fornecedor de vídeo)
  └─→ C-03 (SDK)
        └─→ C-04 (captação WebRTC)
              └─→ C-05 (composição split-screen)
                    ├─→ C-06 (sala de duelo)
                    └─→ C-21 (clipes)
                          └─→ C-29 (clipes premium)
```

**L-03 é o bloqueio mais pesado do projeto.** Sem ele, metade da Fase 1 e quase toda a proposta de valor ficam paradas. Resolver primeiro.

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
L-17 (apps OAuth registrados)
  └─→ entrar com conta real (C-02 já roda com provedor falso)
        └─→ C-36 (publicar o protótipo)
```

```
L-06 (regras dos desafios)
  ├─→ C-10 (desafio da fase 1)
  ├─→ C-20 (catálogo fase 2)
  └─→ C-26 (catálogo completo)
```

---

## O QUE PODE ANDAR EM PARALELO SEM BLOQUEIO

Se você quiser codar hoje e nenhum `[L]` estiver resolvido, estas tarefas não dependem de nada externo:

- ~~**C-01** montar repositório e stack~~ ✅
- ~~**C-02** identidade e login~~ ✅ (entra de verdade só com L-17)
- **C-07** chat por WebSocket
- ~~**C-08** máquina de estados do duelo~~ ✅
- **C-09** votação simples
- **C-14** fórmula do voto cruzado — 🟡 a fórmula está pronta e testada; falta plugar em C-09 e C-12

**Sequência inicial:** C-01 → C-08 → C-14 → C-02. O coração lógico está de pé. O próximo passo sem bloqueio é **C-07** (chat) e depois **C-09** (votação), que já tem identidade para garantir uma conta, um voto.

---

## ARMADILHAS CONHECIDAS

| Armadilha | Consequência |
|---|---|
| Escolher fornecedor de vídeo depois de escrever código de vídeo | Retrabalho da camada inteira |
| Implementar monetização antes do parecer jurídico | Risco regulatório e possível refatoração |
| Coletar biometria antes de L-02 | Exposição jurídica séria — categoria mais sensível do projeto |
| Construir ranking antes de validar o formato (Fase 1) | Trabalho perdido se o formato não engajar |
| Deixar moderação para depois com chats expostos | Primeiro duelo tóxico queima a reputação |
| Descobrir tarde que app OAuth leva dias para aprovar | Ninguém entra na plataforma no dia do teste com criador |
