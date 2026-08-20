# TRENDI — Cérebro do Projeto

Sistema operacional para construir a plataforma sozinho, com IA como executora técnica e você como executor do mundo real.

---

## COMO USAR ESTE CÉREBRO

### Regra de ouro
**Toda sessão de trabalho começa lendo `ESTADO.md` e termina atualizando `ESTADO.md`.**
Sem isso o cérebro morre e vira documentação parada.

### Onde cada coisa vive

**Repositório (Claude Code): a pasta inteira.** O repo é a fonte da verdade. Claude Code trabalha melhor com contexto completo, e o `CLAUDE.md` na raiz ele lê sozinho.

**Projeto no Claude (web/app): só o subconjunto que você raciocina em conversa.**

| Arquivo | Por quê |
|---|---|
| `ESTADO.md` | Toda sessão começa aqui |
| `01-conceito/` (3 arquivos) | Onde você pensa produto e mecânica |
| `03-execucao/backlog.md` + `dependencias.md` | Pra saber o que fazer e o que está travado |
| `04-leonardo/` (4 arquivos) | Jurídico, fornecedor, criador, dinheiro — o mundo real |
| `06-registro/` (2 arquivos) | Decisões travadas e aprendizados |

**Fica só no repo:** `CLAUDE.md`, `02-arquitetura/`, `03-execucao/roadmap.md` e `05-prompts/`. São instruções de construção — no Projeto só ocupam espaço e desviam o foco quando você está resolvendo contrato ou falando com criador.

A lista oficial está em `sync/projeto.manifest`. Ela, não esta tabela, é o que o script lê.

### A duplicação e como não sofrer com ela

Duplicar arquivo gera divergência: `ESTADO.md` existe em dois lugares e eles vão se desencontrar.

**Regra: a versão do repo sempre vence.** Quando um arquivo do subconjunto mudar de forma relevante, você re-sobe no Projeto. `sync/projeto.sh` existe para você não precisar lembrar de cabeça quais mudaram:

```bash
./sync/projeto.sh          # o que mudou desde o último upload
./sync/projeto.sh build    # monta dist/projeto/ + .zip prontos para subir
./sync/projeto.sh mark     # registra "subi isso" (commite o sync/projeto.lock)
./sync/projeto.sh check    # igual ao status, mas sai com erro se houver drift (útil em hook/CI)
```

O `build` achata a estrutura de pastas porque a lista de arquivos do Projeto é plana — os 12 nomes são únicos, e o script falha se algum dia deixarem de ser.

É chato, mas é 30 segundos. A alternativa — manter o `ESTADO.md` só no Projeto e deixar o Claude Code atualizá-lo via `03-execucao/backlog.md` — custa o "leia o ESTADO primeiro" nas sessões de código, que é caro demais.

### Divisão de trabalho

| Marcador | Quem executa |
|---|---|
| **`[C]`** | Claude Code — código, arquitetura, testes, documentação técnica |
| **`[L]`** | Leonardo — jurídico, contratos, cadastros, dinheiro, pessoas, decisões |

Tarefa `[L]` bloqueando tarefa `[C]` é o gargalo mais comum de projeto solo. Por isso `03-execucao/dependencias.md` existe: para você ver com antecedência o que precisa resolver antes de sentar para codar.

---

## MAPA DOS ARQUIVOS

```
trendi/
├── README.md                   ← você está aqui
├── CLAUDE.md                   ← lido automaticamente pelo Claude Code
├── ESTADO.md                   ← ARQUIVO VIVO: onde o projeto está agora
│
├── 01-conceito/
│   ├── produto.md              ← o que é a plataforma e por quê
│   ├── regras-do-duelo.md      ← mecânicas exatas e fórmulas
│   └── catalogo-desafios.md    ← os 10 desafios de lançamento
│
├── 02-arquitetura/             ← endereçado ao Claude Code
│   ├── visao-geral.md
│   ├── stack.md
│   ├── modelo-de-dados.md
│   ├── servicos.md
│   └── convencoes.md
│
├── 03-execucao/
│   ├── roadmap.md              ← fases e portões de validação
│   ├── backlog.md              ← todas as tarefas com ID
│   └── dependencias.md         ← o que trava o quê
│
├── 04-leonardo/                ← só o que exige humano
│   ├── juridico.md
│   ├── fornecedores.md
│   ├── criadores.md
│   └── financeiro.md
│
├── 05-prompts/
│   └── prompts-por-fase.md     ← comandos prontos para o Claude Code
│
├── 06-registro/
│   ├── decisoes.md             ← decisão, data, motivo
│   └── aprendizados.md         ← o que a realidade ensinou
│
└── sync/
    ├── projeto.manifest        ← quais arquivos também vivem no Projeto
    ├── projeto.sh              ← o que re-subir, e o pacote pronto
    └── projeto.lock            ← hashes do último upload (criado pelo `mark`)
```

---

## FLUXO DE TRABALHO

```
1. Abrir ESTADO.md
2. Ver a Frente Ativa e as tarefas desbloqueadas
3. Se for [L] → resolver no mundo real, registrar em 04-leonardo/
   Se for [C] → pegar o prompt em 05-prompts/ e rodar no Claude Code
4. Decisão importante tomada? → registrar em 06-registro/decisoes.md
5. Atualizar ESTADO.md antes de fechar
6. Rodar ./sync/projeto.sh e re-subir no Projeto o que ele listar
```

**Nunca pule o passo 5.**
