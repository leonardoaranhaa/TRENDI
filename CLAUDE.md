# TRENDI — Instruções para o Claude Code

## O que é este projeto

Plataforma web de duelos ao vivo entre criadores de conteúdo. Dois competidores transmitem do navegador, o público assiste em split-screen, escolhe o desafio e vota no vencedor. Ambiente próprio — não embutimos lives de terceiros.

## Antes de escrever qualquer código

Leia, nesta ordem:
1. `ESTADO.md` — onde o projeto está agora
2. `01-conceito/produto.md` — o que estamos construindo
3. `02-arquitetura/` — decisões técnicas já tomadas
4. `06-registro/decisoes.md` — decisões travadas, não reabrir sem motivo novo

## Princípios inegociáveis do produto

Estes não são preferências, são a razão do produto existir. Código que os viole está errado mesmo que funcione:

1. **Dinheiro nunca decide o resultado de um duelo.** Presentes e itens pagos podem afetar atmosfera, cosmético e escolha de desafio — jamais o placar.
2. **O barulhômetro não é placar.** Precisa ser visualmente inconfundível com o resultado.
3. **Voto cruzado é a espinha do julgamento.** Voto da torcida rival pesa mais que o da própria torcida. Sempre normalizado por proporção, nunca por volume absoluto.
4. **Sem download.** Captação por WebRTC direto do navegador. Se uma solução exigir instalar algo, está fora.
5. **Latência simétrica.** Os dois lados veem o mesmo quadro no mesmo instante. É o que legitima o voto.

## Convenções

Ver `02-arquitetura/convencoes.md`. Como este repo está configurado — permissões, hooks, MCP e o que ainda não está ligado: `02-arquitetura/ferramentas.md`.

## Ao concluir uma tarefa

1. Marcar a tarefa em `03-execucao/backlog.md`
2. Atualizar `ESTADO.md`
3. Se tomou decisão técnica relevante, registrar em `06-registro/decisoes.md`
4. Rodar `./sync/projeto.sh` e, se listar algo, avisar o Leonardo no fim da resposta quais arquivos ele precisa re-subir no Projeto do Claude

## Repo x Projeto do Claude

Parte destes arquivos é duplicada no Projeto do Claude (web/app), onde o Leonardo raciocina em conversa. A lista está em `sync/projeto.manifest`.

**A versão do repo sempre vence.** Se ele colar aqui um trecho de um desses arquivos que divirja do que está no repo, o do repo é o correto — ou o Projeto está desatualizado, ou ele editou por lá; nos dois casos, o conserto é editar aqui e re-subir, nunca o contrário. Não edite `sync/projeto.lock` na mão: quem escreve é `./sync/projeto.sh mark`, depois do upload.

## O que NÃO fazer

- Não implementar mecânica paga que toque o resultado antes de `L-02` (parecer jurídico) estar concluída
- Não escolher fornecedor de vídeo por conta própria: depende de `L-03`
- Não coletar nem armazenar template biométrico sem `L-02` concluída
- Não iniciar tarefa cujo bloqueio em `dependencias.md` ainda esteja aberto
