# FORNECEDORES — Pesquisa e Contratação

---

## L-03 — INFRAESTRUTURA DE VÍDEO (bloqueio crítico)

É o maior bloqueio do projeto. Metade da Fase 1 depende disso.

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

> A comparação detalhada ainda não foi feita. É a próxima pesquisa a rodar.

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
