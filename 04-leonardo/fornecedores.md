# FORNECEDORES — Pesquisa e Contratação

---

## L-03 — INFRAESTRUTURA DE VÍDEO ✅ DECIDIDO: Amazon IVS

**Decidido em 2026-08-20**, com autorização sua para o Claude Code escolher. O registro completo, com o porquê e o gatilho de revisão, está em `06-registro/decisoes.md`, D-20.

**O desenho:** Real-Time (stage) recebe os dois competidores pelo navegador → composição no servidor em grade, que é o split-screen → channel de Low-Latency Streaming entrega para a plateia em HLS → gravação composta vai para o S3, que é a matéria-prima dos clipes.

**Preço levantado, América do Sul:**

| Item | Preço |
|---|---|
| Participante no stage (cada competidor) | $0,084/hora |
| Composição no servidor (HD) | $0,30/hora |
| Entrega para a plateia (HD) | $0,084/espectador-hora |
| Entrega (SD) | $0,042/espectador-hora |

Duelo de 30 min com 200 espectadores em HD: ~$0,25 de captação e composição, ~$8,40 de entrega. **A entrega é 97% da conta** — é ela que `L-04` precisa modelar, e é ela que decide se sucesso vira prejuízo.

**O que falta, e é seu (`L-19`):**

- [ ] Criar a conta AWS e habilitar IVS
- [ ] Confirmar que IVS Real-Time atende em `sa-east-1` (São Paulo)
- [ ] Confirmar o comportamento da grade de composição com dois participantes
- [ ] **Criar a *encoder configuration*: 1280×720, 16:9, ~2.500 kbps, 30 fps.** É ela que fixa a qualidade da composição, e 720p é a mitigação de custo já decidida — a entrega é 97% da conta. O ARN vai em `IVS_ENCODER_CONFIGURATION_ARN`.
- [ ] **Confirmar que o lado A aparece à esquerda.** O código manda `participantOrderAttribute: 'side'`, com `'a'` e `'b'` gravados na credencial. O teste prova que mandamos o parâmetro; só a AWS respondendo prova a ordem. Se vier invertido, é uma linha — mas precisa ser vista.
- [ ] Conferir os preços acima — pesquisa de preço envelhece
- [ ] Guardar as credenciais como variável de ambiente (nunca no repo)

Enquanto isso não existe, o código roda contra um fornecedor falso, do mesmo jeito que o login roda sem Google.

---

## Como esta decisão foi tomada (fica para as próximas)

É o maior bloqueio do projeto. Metade da Fase 1 dependia disso.

### Critérios de avaliação

| Critério | Por quê | Peso |
|---|---|---|
| Ingestão WHIP/WebRTC do navegador | Premissa do produto: sem download | Eliminatório |
| Composição server-side de múltiplas fontes | O split-screen sincronizado depende disso | Eliminatório |
| Saída simultânea WebRTC + LL-HLS | Custo escalável sem perder latência onde importa | Alto |
| Gravação e recorte nativos | Viabiliza os clipes premium | Alto |
| Preço por minuto de participante | Define o unit economics | Alto |
| Preço por GB de saída | **Custo dominante em escala** | Alto |
| Infraestrutura na América do Sul | Latência para público brasileiro | Alto |
| Limites de concorrência | Duelo viral não pode derrubar a plataforma | Médio |
| Conformidade LGPD e local de processamento | Exigência jurídica | Médio |
| Qualidade da documentação e SDK | Você está sozinho — documentação ruim custa semanas | Alto |

### Candidatos a avaliar

- LiveKit Cloud
- Cloudflare Realtime + Stream
- 100ms
- Daily
- Agora
- Mux
- Amazon IVS

### Como decidir

1. Eliminar quem não atende os dois critérios eliminatórios
2. Montar planilha comparativa de custo em três cenários: 10, 100 e 1.000 espectadores simultâneos
3. Testar na prática os 2 finalistas — subir um split-screen de teste antes de decidir
4. Registrar a decisão em `06-registro/decisoes.md`

**Resultado da comparação:** Amazon IVS levou por ter presença confirmada na América do Sul somada a composição gerenciada. LiveKit Cloud foi o segundo — open source, com saída de auto-hospedagem, e composição que renderiza página web — e perdeu por não ter região no Brasil confirmada. Cloudflare Realtime não faz composição gerenciada de dois participantes. O passo 3 (subir um split-screen de teste) fica para quando a conta existir: é `L-19`.

---

## L-08 — ESTIMATIVA DE IDADE

**Não construir do zero.** É problema resolvido por serviços especializados.

Critérios:
- [ ] Faz estimativa **sem armazenar template biométrico**
- [ ] Contratualmente garante não retenção
- [ ] Processa dados em jurisdição compatível com LGPD
- [ ] Custo por verificação compatível com volume esperado
- [ ] Taxa de erro aceitável em população brasileira (peles diversas)
- [ ] Oferece caminho alternativo para quem falhar na estimativa

Depende de L-02 estar concluída.

---

## L-11 — BIBLIOTECA DE MÚSICA

Critérios:
- [ ] Licença cobre **streaming ao vivo**
- [ ] Licença cobre **obras derivadas** (clipes redistribuídos em outras redes)
- [ ] Catálogo com estilos compatíveis com a cultura do público
- [ ] Custo fixo previsível, não por uso
- [ ] Não gera reivindicação automática em outras plataformas

---

## L-12 — GATEWAY DE PAGAMENTO

Critérios:
- [ ] Suporta split de pagamento (repasse a criadores)
- [ ] Suporta assinatura recorrente
- [ ] Pix (essencial no Brasil)
- [ ] Taxas compatíveis com ticket baixo
- [ ] Ferramentas antifraude
- [ ] Emissão de informes fiscais dos repasses

Depende de L-05 (CNPJ).

---

## OUTROS

| Fornecedor | Quando | Observação |
|---|---|---|
| Hospedagem de app | Fase 1 | Vercel + container para backend |
| Postgres gerenciado | Fase 1 | — |
| Redis gerenciado | Fase 1 | — |
| Object storage + CDN | Fase 1 | Custo de saída importa |
| Monitoramento de erro | Fase 1 | Obrigatório desde o primeiro deploy |
| LLM para moderação | Fase 2 | Modelo barato e rápido |
| E-mail transacional | Fase 2 | — |
