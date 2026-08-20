# FINANCEIRO

---

## L-04 — MODELAGEM DE CUSTO POR ESPECTADOR-HORA

**A conta mais importante do projeto.** O custo dominante é banda de saída, que cresce com *espectadores × minutos × qualidade* — não com número de duelos. Se a monetização não escalar junto com a audiência, o sucesso vira prejuízo.

### O que a planilha precisa ter

**Entradas:**
- Custo por minuto de participante (fornecedor de vídeo)
- Custo por GB de saída
- Bitrate por qualidade (720p, 1080p)
- Duração média de duelo
- Espectadores médios por duelo
- Custo fixo mensal (bancos, hospedagem, ferramentas)

**Saídas:**
- Custo por duelo
- Custo por espectador-hora
- Custo mensal em 3 cenários: 10, 100 e 1.000 espectadores simultâneos
- Receita necessária por usuário para empatar
- Ponto em que o custo variável ultrapassa a receita

### Cenários a modelar

| Cenário | Duelos/dia | Espectadores médios | Custo/mês | Receita necessária |
|---|---|---|---|---|
| Fase 1 (protótipo) | 2 | 20 | | |
| Fase 2 (MVP) | 10 | 100 | | |
| Fase 3 (beta) | 50 | 300 | | |
| Viral inesperado | 50 | 5.000 | | |

**O cenário "viral inesperado" é o que mata plataforma de streaming.** Precisa ter resposta antes de acontecer: teto de espectadores por duelo, degradação de qualidade automática, ou limite de gasto no fornecedor.

---

## CONTROLES DE CUSTO OBRIGATÓRIOS

- [ ] Alerta de gasto no fornecedor de vídeo
- [ ] Teto de espectadores simultâneos por duelo na fase inicial
- [ ] 720p como padrão, não 1080p
- [ ] LL-HLS para a maioria, WebRTC só para quem precisa
- [ ] Política de retenção de gravações (não guardar tudo para sempre)

---

## ESTRUTURA DE CUSTOS

| Categoria | Fase 1 | Fase 2 | Fase 3 |
|---|---|---|---|
| Infraestrutura de vídeo | baixo | médio | **dominante** |
| Hospedagem e banco | baixo | baixo | médio |
| LLM (moderação) | — | baixo | médio |
| Estimativa de idade | — | baixo | médio |
| Música licenciada | — | — | fixo |
| Jurídico | **alto** (consulta inicial) | baixo | médio |
| Revenue share | — | — | proporcional |

Observação: o custo jurídico é alto no começo e isso é correto. É mais barato que o risco de estruturar errado.

---

## RECEITA — ORDEM DE ATIVAÇÃO

1. **Ferramentas premium de criador** — primeiro a ativar. Custo marginal baixo (a gravação já existe), valor claro, sem complexidade jurídica.
2. **Assinatura de espectador** — segundo. Receita recorrente previsível.
3. **Presentes como gorjeta** — terceiro. Depende de parecer jurídico.
4. **Peso pago na escolha do desafio** — quarto. Maior sensibilidade jurídica.
5. **Patrocínio por categoria** — só com audiência provada.

---

## DISCIPLINA FINANCEIRA PARA PROJETO SOLO

- Não contratar nada anual antes da Fase 2
- Preferir serviços com plano gratuito real na Fase 1
- Registrar todo gasto desde o primeiro dia, mesmo antes do CNPJ
- Separar conta pessoal de conta do projeto imediatamente
