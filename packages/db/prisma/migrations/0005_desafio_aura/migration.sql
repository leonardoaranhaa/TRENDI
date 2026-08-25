-- O desafio da Fase 1 (C-10).
--
-- A tabela `challenges` existe desde a C-01 e nunca teve linha nenhuma. Isso
-- aparecia na tela — o estádio dizia "no ar agora" sem dizer *o quê*, e a
-- plateia julgava desempenho sem saber o que estava sendo executado.
--
-- A Fase 1 lança com uma categoria só: Aura / Presença. É a do público-alvo
-- e a mais simples tecnicamente — sem material, sem música, e por isso sem
-- esbarrar em licença (04-leonardo/juridico.md).
--
-- Os valores vêm do `01-conceito/catalogo-desafios.md`, e há teste
-- comparando os dois: mudar a regra num lugar só acusa.
--
-- O que o público julga NÃO é regra que a plataforma faz cumprir — é a frase
-- que diz à arquibancada o que ela está julgando (decisão D-21). Quem faz
-- cumprir são as três regras de conduta.

INSERT INTO challenges (
  id,
  category,
  name,
  rules,
  judging_criteria,
  min_duration_s,
  max_duration_s,
  duration_options_s,
  min_age,
  needs_material,
  needs_music,
  active
) VALUES (
  '00000000-0000-0000-0000-00000000a11a',
  'aura',
  'Aura',
  'Imponha mais presença que o outro, no tempo que a plateia escolher.',
  'Quem dominou a tela. Sem critério além disso — é subjetivo de propósito, e é a arquibancada que resolve.',
  30,
  90,
  '{30,60,90}',
  0,
  false,
  false,
  true
);
