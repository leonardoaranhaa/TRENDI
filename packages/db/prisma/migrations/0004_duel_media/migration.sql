-- Camada de mídia no duelo (C-03).
--
-- O fornecedor é o Amazon IVS (decisão D-20), mas nada aqui é da AWS: são os
-- identificadores que o serviço de mídia devolve, quaisquer que sejam. Trocar
-- de fornecedor não mexe nestas colunas.

-- Palco onde os dois competidores publicam. Aberto no ACEITE.
ALTER TABLE duels ADD COLUMN stage_id text;

-- Composição no ar. Nulo quando não está rodando — inclusive entre uma queda
-- e a religada.
ALTER TABLE duels ADD COLUMN composition_id text;

-- Onde a plateia assiste. Só existe com a composição no ar.
ALTER TABLE duels ADD COLUMN playback_url text;
