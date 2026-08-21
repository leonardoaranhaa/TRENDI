# REGRAS DA PLATAFORMA

**A plateia julga desempenho. A plataforma julga conduta.**

Essa divisão é a regra que organiza todas as outras. Se um desafio foi bem executado, se foi engraçado, se foi criativo, se mereceu ganhar — isso é da arquibancada, e é exatamente o que o voto cruzado existe para medir. A TRENDI não opina.

O que a TRENDI decide é outra coisa: o que pode acontecer na tela. São três regras, e elas valem para todo mundo — competidor, torcida e Geral — em qualquer categoria, em qualquer duelo.

Cada regra diz também **o que ela não proíbe**. Isso não é enfeite: regra sem limite escrito vira moderação por gosto pessoal, e moderação por gosto pessoal mata o clima que faz o produto existir.

---

## 1. PUDOR

**O que não pode:** nudez, ato sexual, simulação de ato sexual, e exposição de partes íntimas. Vale para vídeo, para imagem e para o chat.

**A régua:** roupa que se usa na rua. Não é sobre estar bonito, arrumado ou dentro do figurino de ninguém — é sobre corpo exposto.

**O que não proíbe:** corpo. Dançar, malhar, tirar a camisa num desafio de resistência, aparecer de biquíni vindo da praia — nada disso é infração. A régua é exposição íntima e ato sexual, não pele.

**Sem exceção para "é arte" ou "faz parte do desafio".** O desafio é escolhido pelo público dentro do catálogo, e o catálogo não tem desafio que exija isso.

---

## 2. RESPEITO

**O que não pode:** assédio, discurso de ódio por característica pessoal — raça, gênero, orientação, religião, deficiência, origem —, ameaça, incitação a ataque coordenado, e exposição de dado pessoal de alguém (endereço, telefone, documento, local de trabalho).

**A régua:** a diferença entre provocar e atacar. Provocar é sobre o duelo. Atacar é sobre a pessoa.

**O que não proíbe — e isso é importante:** zoeira, deboche, provocação entre torcidas, apelido, meme, "seu criador é ruim", "essa torcida não sabe torcer", encarada, tirada. Isso é o jogo. Uma plataforma de duelo sem provocação é uma plataforma morta, e a moderação foi desenhada para entender essa diferença (ver `02-arquitetura/servicos.md`, camada 2).

**Onde a linha fica clara:** falar do desempenho, do duelo, da torcida — vale. Falar do corpo, da família, da origem, ou de qualquer coisa que a pessoa não escolheu — não vale.

---

## 3. SEGURANÇA E LEGALIDADE

**O que não pode:** uso de droga ilícita, arma, automutilação, incentivo a automutilação ou a transtorno alimentar, crime em andamento, e desafio com risco real de lesão.

**A régua aqui não é gosto, é dano.** As duas primeiras regras protegem quem assiste; esta protege quem está na tela.

**O que não proíbe:** esforço físico, competição cansativa, comida nojenta, susto, adrenalina. Passar mal de rir não é lesão.

**Consequência é diferente nesta regra:** as outras duas escalam. Esta corta na hora — o duelo é encerrado, sem esperar revisão.

---

## COMO A REGRA VIRA AÇÃO

| Situação | O que acontece |
|---|---|
| Mensagem de chat que fere a regra | Removida na hora. Reincidência silencia a conta no duelo |
| Cena que fere pudor ou respeito | Aviso ao competidor; persistindo, duelo encerrado |
| Cena que fere segurança | Duelo encerrado imediatamente, sem aviso |
| Duelo encerrado por infração | Conta como desistência de quem infringiu, com a penalidade progressiva (`regras-do-duelo.md` §5) |
| Reincidência | Suspensão, e em caso grave, banimento |

Quem é encerrado por infração **não** perde o duelo por voto: perde por conduta. A distinção existe para o placar continuar significando desempenho, que é o que o ranking mede.

Contestação usa o mesmo fluxo da desistência — decisão de moderação errada precisa ter volta, e resposta rápida.

**Onde isso é implementado:** moderação em camadas é `C-22`; a fila humana é `C-23`; a penalidade é `C-17`. Enquanto essas tarefas não existirem, a moderação da Fase 1 é manual, com o duelo rodando entre criadores convidados — que é exatamente o desenho da fase.

---

## O QUE A PLATAFORMA NÃO DECIDE

- Se o desafio foi bem cumprido
- Se foi engraçado, criativo ou bonito
- Se a torcida foi justa
- Quem merecia ganhar

Nada disso tem regra, e não vai ter. É da plateia — pelo voto, com peso maior para quem torce contra (`06-registro/decisoes.md`, D-02). Uma plataforma que começa a julgar desempenho vira júri, e júri não precisa de arquibancada.
