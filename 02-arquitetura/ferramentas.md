# FERRAMENTAS — como o Claude Code opera neste repo

Este arquivo é instrução de construção: fica **só no repo**, não vai para o Projeto do Claude.

---

## O que está configurado

| Arquivo | O que faz |
|---|---|
| `CLAUDE.md` | Lido automaticamente. Princípios inegociáveis, ordem de leitura, o que não fazer. |
| `.claude/settings.json` | Permissões, hooks e aprovação dos servidores MCP do projeto. |
| `.claude/hooks/estado.sh` | **SessionStart**: injeta fase, frente ativa, bloqueios e drift de sincronia no contexto. Garante o "leia o ESTADO primeiro" sem depender de ninguém lembrar. |
| `.claude/hooks/lembrete-sync.sh` | **Stop**: ao fim da resposta, avisa quais arquivos precisam de re-upload no Projeto. Fala uma vez por conjunto de mudanças; não repete. |
| `.claude/commands/` | `/estado`, `/tarefa <ID>`, `/fechar` — o fluxo do README virado comando. |
| `.mcp.json` | Servidores MCP do projeto. Hoje: só o GitHub. |
| `.github/workflows/verificar.yml` | Em cada PR: valida o manifesto, a sintaxe dos scripts e o pacote de sincronia. |

### Permissões

Aprovado sem perguntar: `./sync/projeto.sh`, git de leitura (`status`, `diff`, `log`, `show`, `branch`, `fetch`), `git add`, `git commit`, e edição dos seis diretórios do cérebro mais o `ESTADO.md`.

Continua perguntando: `git push` (é o que sai do seu computador), edição de `CLAUDE.md` e de `.claude/` (mudança de regra do jogo deve ser visível).

Negado: editar `sync/projeto.lock` na mão — quem escreve é `./sync/projeto.sh mark`. E ler `.env`.

Para afrouxar ou apertar, edite `.claude/settings.json` ou rode `/permissions`. Preferências suas, que não valem para o repo, vão em `.claude/settings.local.json` (ignorado pelo git).

---

## MCP

### Ativo

**`github`** — servidor remoto oficial (`https://api.githubcopilot.com/mcp/`). Serve para ler e abrir issues e PRs sem sair do terminal.

Autentica com um token pessoal, que **não fica no repo**: o `.mcp.json` referencia `${GITHUB_PAT}`. Para ligar:

1. Gere um fine-grained token em https://github.com/settings/personal-access-tokens com acesso ao repo `TRENDI`.
2. `export GITHUB_PAT=ghp_...` no seu `~/.zshrc` ou `~/.bashrc`.
3. Abra o Claude Code e rode `/mcp`. Deve aparecer `connected`. Se aparecer `failed` com 401, o token está errado ou não alcança o repo.

Sem a variável exportada, o servidor apenas falha ao conectar — nada mais quebra.

Nas sessões web (claude.ai/code) o GitHub já vem conectado pela integração da conta; essa configuração é para o Claude Code no seu computador.

### Ainda não — e por quê

| Servidor | Quando entra | Por que não agora |
|---|---|---|
| Playwright (`npx -y @playwright/mcp@latest`) | Fase 1, junto com `C-02` | Sobe um processo e baixa um navegador a cada sessão. Antes de existir tela para testar, é só peso e lentidão no boot. |
| Fornecedor de vídeo (LiveKit, Daily, 100ms…) | Depois de `L-03` | O `CLAUDE.md` proíbe escolher fornecedor de vídeo por conta própria. Configurar o MCP de um deles seria escolher pela porta dos fundos. |
| Banco de dados e pagamentos | Depois de `L-05` | Depende de CNPJ e de decisão de stack ainda não tomada. |

Quando for a hora do Playwright, o bloco é este, dentro de `mcpServers` no `.mcp.json`:

```json
"playwright": { "command": "npx", "args": ["-y", "@playwright/mcp@latest"] }
```

E acrescente `"playwright"` em `enabledMcpjsonServers` no `.claude/settings.json`, senão ele fica pendente de aprovação.

### Conectores da conta

Gmail, Google Drive/Agenda, Canva, Vercel e afins são conectores da sua conta no claude.ai, não deste repo. Aparecem sozinhos nas sessões web e no Claude Code local via `/mcp`. Não há nada para configurar aqui, e nada aqui os desliga.

### O MCP que resolveria a duplicação não existe

O trabalho manual que sobrou é subir 12 arquivos no Projeto do Claude quando eles mudam. Não há API pública para escrever nos arquivos de um Projeto, então não há MCP capaz de automatizar isso. É por isso que `sync/projeto.sh` para no `build`: ele monta o pacote e o upload é seu. Se um dia essa API existir, o `mark` vira a última etapa de um script só.

---

## Fora do computador do Leonardo

- **Sessões web / app** (claude.ai/code): leem `CLAUDE.md`, `.claude/settings.json` e `.mcp.json` do repo igual ao CLI. Os hooks rodam. O `/mcp` do GitHub usa a integração da conta, não o `${GITHUB_PAT}`.
- **CI**: `.github/workflows/verificar.yml` não roda modelo nenhum, só bash. Valida o que o `sync/projeto.sh` promete.
