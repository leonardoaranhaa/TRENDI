# MODELO DE DADOS

Entidades principais. Detalhamento de colunas fica a cargo da implementação.

## Núcleo

```
usuario
  id, handle, email (pode ser nulo), nome_de_exibicao, avatar_url
  hash_da_senha (nulo em quem só usa OAuth)
  email_verificado_em
  papel: espectador | criador
  status: ativo | suspenso | banido
  criado_em, atualizado_em

  Senha é guardada só como hash scrypt (D-19).
  Sem idade e sem biometria enquanto C-24 estiver travada em L-08 → L-02.
  Os campos de idade entram lá, não antes.

conta_provedor  (OAuth — tabela `accounts`)
  id, usuario_id, provedor (google|discord), id_no_provedor
  único: (provedor, id_no_provedor) — é a chave da identidade, não o e-mail

token_de_autenticacao  (tabela `auth_tokens`)
  id, usuario_id, proposito (email_verification | password_reset)
  hash_do_token, expira_em, usado_em
  Uso único. Como na sessão, o token em si não é guardado.

sessao  (tabela `sessions`)
  id, usuario_id, hash_do_token, expira_em, criado_em
  O token em si nunca é guardado. Ver decisão D-16.

criador  (extensão de usuario)
  audiencia_media, duelos_totais, vitorias, derrotas
  taxa_conclusao, nivel_penalidade, penalidade_expira_em
  pontos_ranking, temporada_atual
```

## Duelo

```
duelo
  id, criador_a, criador_b
  estado: fila|pareado|aceite|escolha|preparo|execucao|votacao|resultado|cancelado
  desafio_id, tempo_escolhido_s
  iniciado_em, encerrado_em
  vencedor, pontuacao_a, pontuacao_b
  valido_para_ranking: bool
  gravacao_url

desafio
  id, categoria, nome, regra, criterio_julgamento
  tempo_min_s, tempo_max_s, opcoes_tempo[]
  idade_minima, precisa_material, precisa_musica
  ativo: bool

voto_desafio     (escolha do desafio + tempo)
  duelo_id, usuario_id, desafio_id, tempo_s, peso, criado_em

voto_resultado
  duelo_id, usuario_id, votou_em (a|b)
  arquibancada_origem: torcida_a | torcida_b | geral
  criado_em, anulado: bool, motivo_anulacao
```

**Nota crítica:** `voto_resultado` **não tem coluna de peso pago**. Voto de resultado é sempre gratuito e igual. Ver `06-registro/decisoes.md`, decisão D-03.

## Arquibancada e chat

```
presenca
  duelo_id, usuario_id, arquibancada, entrou_em, travado: bool

mensagem
  id, duelo_id, usuario_id, arquibancada, texto, criado_em
  status_moderacao: aprovada|retida|removida
  motivo_moderacao

sinal_barulho     (agregado, não por mensagem)
  duelo_id, arquibancada, janela_ts
  msgs_por_s, emotes, reacoes, presentes
  intensidade_normalizada  (0-1, relativa ao tamanho da torcida)
```

## Penalidade

```
desistencia
  id, duelo_id, criador_id, ocorrido_em
  contestada: bool, resultado_contestacao
  motivo_declarado

penalidade
  criador_id, nivel, aplicada_em, expira_em
  espera_adicional_min, faixa_pareamento_reduzida
  duelos_para_reabilitar
```

## Financeiro

```
carteira
  usuario_id, saldo, moeda

transacao
  id, usuario_id, tipo: assinatura|presente|repasse|saque
  valor, duelo_id (opcional), criado_em, status
```

## Clipes

```
clipe
  id, duelo_id, criador_id, inicio_s, fim_s
  formato, url, gerado_em, premium: bool
```

## Índices que importam

- `voto_resultado(duelo_id, usuario_id)` — único, é a garantia de 1 voto por conta
- `accounts(provedor, id_no_provedor)` — único, é o que faz o segundo login achar a conta
- `sessions(hash_do_token)` — único, é por onde toda requisição autenticada passa
- `auth_tokens(hash_do_token)` — único, é o link de verificar e-mail e de trocar senha
- `presenca(duelo_id, usuario_id)` — único
- `duelo(estado)` — consulta constante para duelos ao vivo
- `sinal_barulho(duelo_id, janela_ts)` — série temporal do barulhômetro
