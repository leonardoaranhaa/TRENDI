# REGISTRO DE DECISÕES

Decisões já tomadas. **Não reabrir sem motivo novo.** Este arquivo existe para você não refazer discussão vencida seis meses depois.

Formato: o que foi decidido, quando, por quê, e o que foi descartado.

---

## D-01 — Ambiente próprio, não integração com plataformas existentes
**Data:** — **Status:** travada

**Decisão:** a TRENDI hospeda o vídeo. Não embutimos lives de Twitch, YouTube ou Kick.

**Por quê:** com players de terceiros é impossível garantir latência simétrica entre os dois competidores. Como o produto inteiro depende do público julgar desempenho, latência assimétrica torna o julgamento ilegítimo. Compondo os dois vídeos no servidor, os dois lados veem o mesmo quadro no mesmo instante.

**Descartado:** integração via iframe oficial das plataformas — mais barato e rápido, mas quebra a premissa central.

**Custo da decisão:** infraestrutura muito mais cara e complexa. Aceito conscientemente.

---

## D-02 — Voto cruzado com normalização por proporção
**Data:** — **Status:** travada

**Decisão:** 50% voto da torcida rival, 35% da Geral, 15% da própria torcida. Sempre normalizado por proporção de cada arquibancada, nunca por volume absoluto.

**Por quê:** se cada torcida vota no seu ídolo, ganha sempre a torcida maior — o mesmo defeito do TikTok, trocando dinheiro por número de fãs. Com voto cruzado, para vencer é preciso converter quem torce contra. A normalização por proporção permite que um criador de 100 espectadores vença um de 10.000.

**Descartado:** voto simples por maioria; julgamento por IA (removido por não fazer sentido para desafios subjetivos).

**Efeito colateral desejado:** muda o comportamento do competidor — ele passa a jogar para a plateia adversária, que é onde nasce o momento viral.

---

## D-03 — Dinheiro nunca decide resultado
**Data:** — **Status:** travada

**Decisão:** voto de resultado é sempre gratuito e igual para todos. Presentes e itens pagos afetam atmosfera, cosmético e escolha de desafio — nunca o placar.

**Por quê:** três razões que se reforçam. Competitiva: se dinheiro decide, viramos o TikTok e perdemos o diferencial inteiro. Jurídica: pagamento que influencia resultado com prêmio em dinheiro aproxima o produto do regime de promoção comercial da Lei 5.768/1971, exigindo autorização da SPA/MF. De credibilidade: o ranking só vale se as pessoas acreditarem que mede habilidade.

**Consequência no código:** a tabela `voto_resultado` não tem coluna de peso pago. Ver `02-arquitetura/modelo-de-dados.md`.

---

## D-04 — Chats expostos com escrita restrita
**Data:** — **Status:** travada

**Decisão:** os três chats ficam visíveis para todos, mas cada pessoa só escreve na sua arquibancada.

**Por quê:** a exposição gera a tensão competitiva que o produto quer (decisão do Leonardo). A restrição de escrita preserva 100% dessa tensão enquanto remove o canal direto de ataque pessoal entre torcidas rivais, que é o mecanismo por trás da maior parte do assédio em formatos de confronto.

**Descartado:** chats totalmente separados (mais seguro, menos vivo); chat único (mais caótico, perde a metáfora de estádio).

**Custo da decisão:** carga de moderação significativamente maior. Precisa estar no orçamento operacional desde o dia 1.

---

## D-05 — Barulhômetro é atmosfera, não placar
**Data:** — **Status:** travada

**Decisão:** medidor de interação em tempo real entre os chats, normalizado por tamanho de torcida, visualmente inconfundível com o placar.

**Por quê:** a normalização impede que a torcida maior domine sempre e mate a graça do recurso. A separação visual do placar protege os três pilares: diferencial competitivo, segurança jurídica e credibilidade do ranking.

---

## D-06 — Estimativa de idade em vez de reconhecimento facial
**Data:** — **Status:** travada (sujeita a confirmação em L-02)

**Decisão:** usar estimativa de idade (analisa e descarta) como padrão de acesso. Reservar verificação de identidade com documento apenas para recursos de saque, onde é exigência de compliance financeiro de qualquer forma.

**Por quê:** biometria é dado pessoal sensível na LGPD, e biometria de menores é a categoria de maior exposição jurídica do projeto. Estimativa de idade resolve o problema de portão etário com uma fração do risco e do custo.

---

## D-07 — Sem prêmio em dinheiro no lançamento
**Data:** — **Status:** travada (revisar após L-02)

**Decisão:** o vencedor leva ranking, status e visibilidade. Sem prêmio em dinheiro nas fases iniciais.

**Por quê:** é exatamente assim que as PK Battles operam no Brasil hoje sem enquadramento como aposta. Remove a principal fonte de risco regulatório enquanto o formato é validado. Se for reintroduzido depois, precisa ser custeado pela plataforma, com valor fixo independente da arrecadação.

---

## D-08 — Fase 1 com uma única categoria: Aura
**Data:** — **Status:** travada

**Decisão:** o protótipo implementa só a categoria Aura / Presença.

**Por quê:** é o público-alvo do lançamento e é a categoria mais simples tecnicamente — não exige material nem ferramenta na tela. Permite validar o formato com o mínimo de código.

---

## MODELO PARA NOVAS DECISÕES

```
## D-XX — [título curto]
**Data:** **Status:** travada | em revisão

**Decisão:**
**Por quê:**
**Descartado:**
**Custo da decisão:**
```

---

## D-09 — Nome da plataforma: TRENDI
**Data:** — **Status:** em revisão (depende de L-01)

**Decisão:** o nome do produto passa a ser TRENDI.

**Por quê:** curto, fácil de falar em português, e amarra com o posicionamento — o produto vive de tendência, tanto no catálogo de desafios (alimentado por trends) quanto no objetivo dos criadores (viralizar).

**Descartado:** AURA (envelhece junto com o meme), Blessed, GERAL, RACHA.

**Risco conhecido:** por derivar de palavra comum do setor, tende a ser classificado como marca sugestiva — registro mais difícil e proteção mais fraca. Ver `04-leonardo/juridico.md`. Status só passa a "travada" após L-01.
