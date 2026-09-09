# BoraBora — Roteirizador (CVRP)

Sistema que aloca localizações a rotas com capacidade limitada (respeitando
a demanda de passageiros de cada localização) e traça o trajeto ótimo de
cada rota, partindo de um depósito fixo, usando dados reais do Google Maps.

## Estrutura

- `server/` — API em Node.js + TypeScript (Express). Roda o algoritmo de
  alocação + ordenação (TSP) e consulta Google Distance Matrix / Directions.
- `client/` — Interface em React + TypeScript (Vite), com mapa via
  `@react-google-maps/api`.

## Setup

1. Instale as dependências (na raiz, cobre os dois workspaces):

   ```
   npm install
   ```

2. Copie `.env.example` e crie os dois arquivos reais:

   - `server/.env`:
     ```
     GOOGLE_MAPS_API_KEY=sua-chave-secreta-aqui
     PORT=3001
     ```
   - `client/.env`:
     ```
     VITE_GOOGLE_MAPS_JS_KEY=sua-chave-client-side-aqui
     ```

   **Importante — use DUAS chaves diferentes** no Google Cloud Console:
   - A chave do `server/.env` precisa das APIs **Distance Matrix** e
     **Directions** habilitadas, e deve ser restrita por **IP** (nunca vai
     para o navegador).
   - A chave do `client/.env` precisa apenas da **Maps JavaScript API**
     habilitada, e deve ser restrita por **referrer HTTP** (é exposta no
     bundle do navegador de propósito — normal para uso client-side do
     Google Maps).

3. Rode a migração do banco (cria `server/data/borabora.db` e aplica o
   schema — só precisa rodar de novo quando o schema mudar):

   ```
   npm run db:migrate -w server
   ```

4. Suba os dois serviços juntos:

   ```
   npm run dev
   ```

   Backend em `http://localhost:3001`, frontend em `http://localhost:5173`
   (o Vite faz proxy de `/api` para o backend).

## Testando sem uma chave real

O CRUD de localizações e rotas funciona normalmente sem nenhuma chave
configurada. Só o botão "Otimizar" exige `GOOGLE_MAPS_API_KEY` (retorna 503
com uma mensagem clara se estiver faltando).

A lógica central (alocação por capacidade e ordenação das paradas) é testada
sem precisar de rede nem chave:

```
npm run test -w server
```

## Testando o fluxo completo com uma chave real

1. Adicione 2-3 rotas pela interface, cada uma com um depósito real
   (lat/lng de uma cidade) e uma capacidade pequena (ex: 3-4).
2. Adicione 8-10 localizações espalhadas perto desses depósitos.
3. Clique em "Otimizar" e confira:
   - As localizações ficam coloridas de acordo com a rota a que foram
     atribuídas;
   - As linhas desenhadas seguem ruas reais (não linhas retas);
   - O painel de resultado mostra distância/duração totais por rota.
4. Para testar o caso de capacidade insuficiente, cadastre mais localizações
   do que a soma das capacidades das rotas comporta, e confira que elas
   aparecem listadas como não alocadas (`unassignedLocationIds`).

## Origem por passageiro (rotas manuais)

Além do depósito fixo, uma rota cadastrada manualmente pode usar **"Melhor
passageiro (calculado ao otimizar)"** como ponto de partida — mesma ideia do
modo automático, só que aplicada a uma rota nomeada específica:

- O depósito cadastrado continua existindo e é usado como **referência
  geográfica** na fase de alocação (decidir quais passageiros pertencem a
  essa rota).
- O trajeto de fato **não** começa nele — começa em qualquer um dos
  passageiros já atribuídos, o que a otimização (TSP de caminho aberto)
  decidir ser o melhor ponto de partida.
- "Retornar ao depósito" fica desabilitado nesse modo (não há depósito real
  na ponta do trajeto). Se houver um destino global configurado, ele
  continua valendo normalmente como ponto final.
- No mapa, a rota aparece com um losango semitransparente na origem
  calculada (em vez do círculo de depósito fixo) — só aparece depois de
  otimizar, já que antes disso não há como saber qual passageiro será o
  escolhido.

Essa opção fica ao lado de "Depósito cadastrado" no formulário de nova rota
(e na edição de uma rota existente).

## Modo automático (sem cadastrar rotas)

Em vez de pré-cadastrar rotas com depósito fixo, o painel **"Modo automático"**
permite cadastrar só as localizações + uma capacidade por veículo, e clicar
em "Calcular rotas automaticamente". O sistema:

1. Calcula quantas rotas são necessárias (agrupamento por varredura angular
   respeitando a capacidade).
2. Escolhe, para cada rota, o próprio passageiro mais eficiente como ponto de
   partida (sem depósito fixo) — a otimização decide, não é literalmente "o
   primeiro cadastrado".
3. Detecta localizações muito distantes das demais (heurística: distância ao
   vizinho mais próximo > 3x a mediana do grupo, com no mínimo 4 localizações
   para a estatística fazer sentido) e pergunta o que fazer com elas antes de
   finalizar: **"Criar rota exclusiva"** (uma rota só para esse passageiro) ou
   **"Sem rota por enquanto"** (fica de fora, listado em
   `unassignedLocationIds`).

O destino global (se configurado) se aplica normalmente também no modo
automático — todas as rotas automáticas convergem para lá.

## Melhoria entre rotas (relocate/swap)

Depois da alocação inicial (gulosa, por proximidade ao depósito), o sistema
roda uma segunda passada tentando **mover** ou **trocar** passageiros entre
rotas já montadas, se isso reduzir a distância total combinada:

- **Relocate**: move 1 passageiro de uma rota pra outra, se a capacidade
  permitir.
- **Swap**: troca 1 passageiro de cada rota entre si (útil quando nenhuma
  rota tem folga de capacidade pra um relocate simples).

Isso corrige o principal ponto fraco da alocação gulosa: ela decide "quem vai
em qual rota" só pela distância ao depósito, sem olhar a rota toda — então
duas rotas que se cruzam geograficamente podem ficar com passageiros
"trocados" (alguém que faria mais sentido na rota vizinha). Passageiros que
você **forçou manualmente** numa rota (painel de "sem rota") nunca são
mexidos por essa melhoria automática.

Roda automaticamente em toda otimização do modo manual — não precisa
habilitar nada. (O modo automático já agrupa geograficamente desde o início,
então essa segunda passada não se aplica a ele por enquanto.)

## Horário de partida e ETA por parada

O painel **"Horário de partida"** define um horário (`HH:MM`) opcional,
compartilhado por todas as rotas. Quando definido, cada parada no painel de
resultado (e no mapa, ao clicar num passageiro) mostra o horário estimado de
chegada, e cada rota mostra o horário estimado de chegada no ponto final.

O ETA é calculado a partir da mesma matriz de duração usada pro total da
rota (não dos `legs` do Directions) — garante que a soma das estimativas por
parada sempre bate com o total exibido.

Esse modo é independente do modo manual (rotas cadastradas com depósito fixo)
e usa o mesmo painel de resultado e mapa — pode alternar entre os dois
livremente, o botão "Otimizar" sempre roda o modo manual e "Calcular rotas
automaticamente" sempre roda o automático.

## Abrir no Google Maps

Cada rota no painel de resultado tem um botão **"Abrir no Google Maps"** —
gera um link público (sem precisar de chave de API nem app nenhum do
BoraBora) com a origem, as paradas na ordem já calculada, e o destino final,
pronto pra abrir no celular do motorista (app ou navegador) e navegar direto.
O Google Maps respeita a ordem dada e não reotimiza os waypoints.

## Importação CSV de localizações

O painel **"Importar CSV"** (na seção "Localizações") permite cadastrar várias
localizações de uma vez, em vez de uma por uma pelo formulário:

- Colunas aceitas no cabeçalho (case-insensitive, com aliases em português):
  `name`/`nome` (obrigatória), `lat`/`latitude` + `lng`/`lon`/`long`/`longitude`,
  `address`/`endereco`/`endereço`/`rua`, e `demand`/`demanda`/`passageiros`/`pax`
  (opcional, padrão 1).
- Cada linha pode informar `lat`+`lng` diretamente **ou** um `address` — nesse
  caso o servidor geocodifica o endereço (exige `GOOGLE_MAPS_API_KEY`
  configurada; sem ela, linhas com endereço são rejeitadas com um erro claro
  em vez de travar a importação inteira).
- O botão **"Baixar modelo CSV"** baixa um exemplo pronto pra editar.
- Depois de escolher o arquivo, a tela mostra uma prévia (quantas linhas serão
  importadas) antes de confirmar. Ao importar, cada linha é validada
  independentemente — uma linha com erro (nome ausente, coordenadas inválidas,
  endereço não encontrado) não impede as demais de serem criadas; o resumo
  final mostra quantas localizações entraram e a lista de erros por linha.
- Limite de 300 linhas por importação; o endpoint (`POST
  /api/locations/import`) usa o mesmo limite de requisições mais estrito dos
  endpoints que chamam o Google (30 a cada 15 min), já que pode disparar uma
  geocodificação por linha.

## Autenticação e rate limiting

Por padrão a API roda **aberta** (sem senha) — ótimo pra uso local sozinho.
Antes de expor este servidor além do seu localhost (rede local, internet),
defina uma senha em `server/.env`:

```env
APP_PASSWORD=uma-senha-forte-aqui
```

Isso NÃO é um sistema de contas de usuário — é um segredo único
compartilhado, pensado pra impedir que qualquer um na rede crie/exclua dados
ou queime a cota da sua chave do Google. Com a senha definida:

- O frontend mostra uma tela de login simples antes de carregar qualquer
  dado; a senha digitada fica salva no navegador (`localStorage`) e é
  reenviada automaticamente em toda chamada (`Authorization: Bearer <senha>`).
- Um botão **"Sair"** aparece no cabeçalho pra limpar a senha salva.
- Sem `APP_PASSWORD` configurada (padrão), nada disso aparece — a app carrega
  direto, sem nenhuma fricção.

Além disso, todo endpoint sob `/api` tem um limite geral de requisições (300
a cada 15 min por IP), e os que chamam o Google (`/optimize`,
`/auto-optimize`, `/geocode` — os que custam dinheiro de verdade por
chamada) têm um limite mais estrito (30 a cada 15 min). `/api/health` fica
sempre público, sem exigir senha, pra diagnóstico.

## UX: confirmação, busca, diagnóstico, reordenação, travas, ícones e mobile

- **Confirmação antes de excluir**: o botão "Excluir" (de rota ou localização)
  não apaga na hora — vira uma confirmação inline ("Confirmar? Sim / Não") no
  próprio item da lista, evitando perda de cadastro por clique errado.
- **Busca/filtro na lista de localizações**: um campo de texto filtra por
  nome, e (depois de otimizar pelo menos uma vez) um seletor permite filtrar
  só as localizações de uma rota específica, ou só as sem rota.
- **Painel "Diagnóstico do Google Maps"**: no topo da barra lateral, mostra em
  um clique ("Detalhes") o status de cada peça da configuração do Google —
  chave do servidor configurada, chave do cliente carregada com sucesso no
  navegador, e a Distance Matrix API realmente respondendo (chamada de teste
  mínima, não só "a chave existe"). Ajuda a diagnosticar problema de setup
  sem precisar ler logs do servidor. A chamada só roda quando você abre
  "Detalhes" pela primeira vez (ou clica "Testar novamente") — não em todo
  carregamento da página, pra não consumir a cota de requisições à toa.
- **Reordenar paradas manualmente**: no painel de resultado, cada parada tem
  setas ↑/↓ pra trocar de posição dentro da rota (ex: motorista pediu pra
  inverter a ordem de 2 paradas). Ao mover, o backend recalcula distância,
  duração, trajeto real (Directions) e ETA só daquela rota (`POST
  /api/routes/manual-order`) — não roda o pipeline inteiro de novo, e não
  mexe em qual rota cada passageiro pertence, só a ordem de visita.
- **Travar uma parada em uma posição**: na lista de localizações, um seletor
  permite travar uma parada como **primeira** ou **última** dentro da rota em
  que ela cair (ex: "essa pessoa mora mais longe e sai depois do trabalho,
  tem que ser a última"). A trava é respeitada tanto pelo TSP do modo manual
  quanto do modo automático — o resto das paradas continua sendo otimizado
  livremente ao redor da posição travada. É um ajuste por-otimização (não
  fica salvo no cadastro da localização), enviado junto com cada chamada de
  otimizar, do mesmo jeito que as atribuições forçadas.
- **Ícones por rota, não só cor**: cada rota tem uma combinação fixa de
  cor **e forma** (círculo, quadrado, triângulo, losango, pentágono, cruz,
  hexágono, estrela, octógono) nos marcadores do mapa e nos indicadores das
  listas — ajuda quem tem daltonismo a diferenciar rotas sem depender só da
  cor.
- **Layout de despacho (trilha de ícones + painel + mapa)**: inspirado em
  ferramentas de roteirização/despacho (Onfleet, Circuit, Route4Me), a antiga
  sidebar larga com abas dentro virou 3 colunas fixas:
  - Uma **trilha estreita de ícones** (76px) na borda esquerda, sempre
    visível, com a navegação principal — **🚐 Rotas**, **📍 Locais**,
    **⚡ Otimizar**, **✅ Embarque**, **📊 Relatórios** — e o ícone de
    engrenagem (⚙️) + sair no rodapé. Cada seção tem um propósito só (evita
    o problema de uma aba "Cadastro" genérica virar um catch-all de novo).
  - Um **painel de conteúdo** (380px) ao lado, com o título da seção ativa +
    uma linha de dica explicando pra que serve, e o conteúdo daquela seção
    (formulário + lista).
  - O **mapa ocupa todo o resto da tela** (bem mais espaço que antes, já que
    a navegação não compete mais por largura com o conteúdo), com um resumo
    flutuante no topo (🚐 rotas, 📍 locais e, quando já tem resultado,
    📏 distância / ⏱ tempo totais e ⚠ localizações sem rota).
  - O diagnóstico do Google Maps, o destino compartilhado e o horário de
    partida — configurações que se define uma vez e raramente revisita —
    ficam fora da navegação principal, atrás do ícone de engrenagem, que
    abre um popover com os três juntos.
  - Os formulários "Nova rota" e "Nova localização" (que cresceram bastante
    com os campos de motorista/veículo/recorrência) ficam recolhidos atrás
    de um botão "+ Nova rota" / "+ Nova localização" — a lista cadastrada é
    o conteúdo principal da seção, não o formulário.
  - Na seção Otimizar, o botão principal ("Otimizar rotas cadastradas") e o
    resultado vêm primeiro; o "Modo automático" (um jeito alternativo de
    rodar sem rotas pré-cadastradas) fica recolhido atrás de um botão "Usar
    modo automático", pra não competir visualmente com o fluxo principal.
- **Layout responsivo (celular)**: abaixo de 768px de largura, a trilha de
  ícones vira uma barra horizontal no topo (só ícone + rótulo curto, sem a
  marca) e o painel/mapa deixam de ficar lado a lado (não cabe os dois numa
  tela de celular) — viram duas telas cheias alternáveis por um botão
  "📋 Painel / 🗺️ Mapa" no topo, pensado pra motoristas/gestores que
  acompanham a rota pelo celular.

## Motorista, veículo, recorrência semanal, relatórios e embarque

- **Motorista e veículo por rota**: cada rota pode ter nome/telefone do
  motorista, placa e um "tipo de veículo" (rótulo livre, com atalhos pra
  Carro/Van/Ônibus que preenchem valores padrão). Aparece como badge no
  resultado da otimização e é salvo junto quando a viagem é confirmada.
- **Múltiplos tipos de veículo (velocidade/custo)**: cada rota tem um
  **fator de velocidade** (multiplica a duração/ETA — não a distância; ex:
  1.2 = 20% mais lento que a referência do Google, útil pra ônibus/vans) e um
  **custo por km** (só pra relatório, não entra na otimização — o algoritmo
  continua escolhendo pela distância real).
- **Recorrência semanal**: cada rota pode ter dias da semana em que roda
  (ex: só segunda a sexta). Rotas fora do dia atual são automaticamente
  ignoradas ao clicar "Otimizar" — o resultado mostra um aviso com quais
  rotas ficaram de fora por causa disso. Nenhum dia marcado = roda todo dia
  (comportamento padrão, sem precisar configurar nada em rotas existentes).
- **Confirmar viagem de qualquer dia**: o resultado de uma otimização é só
  uma prévia — clicar em "✅ Confirmar viagem..." no painel de resultado
  salva uma cópia permanente (motorista, paradas, distância, custo estimado)
  como o histórico daquele dia. Só otimizar/reotimizar de novo **não** grava
  nada — é uma ação explícita, pra não sujar o histórico com ajustes/testes.
  O campo "Confirmar para o dia" antes do botão tem "hoje" como padrão, mas
  pode ser trocado — útil pra registrar um teste feito hoje como a viagem de
  amanhã, sem precisar reotimizar no dia certo.
- **Confirmação de embarque / no-show**: aba "Embarque" — escolha uma data
  (padrão: hoje) e marque, por passageiro, "✓ Embarcou" ou "✗ Faltou" numa
  viagem já confirmada. Clicar de novo no mesmo estado desmarca. Usa o mesmo
  login (senha compartilhada) do resto do app — pensado pro dispatcher, não
  pro motorista (ver link dedicado abaixo).
- **Link do motorista**: cada rota, na aba "Embarque", tem um botão
  "🔗 Link do motorista" que copia (e mostra) uma URL do tipo
  `/motorista/<id>` — uma página separada, sem sidebar/mapa/login, feita pra
  abrir no celular do próprio motorista. Ele vê só a rota dele e marca quem
  embarcou direto, sem precisar da senha do painel admin. O id na URL é um
  UUID já gerado na confirmação da viagem (não sequencial, não adivinhável)
  e só dá acesso àquela rota específica — nunca às outras rotas da mesma
  viagem nem a outras viagens.
- **Pontualidade real**: toda vez que "✓ Embarcou"/"✗ Faltou" é marcado
  (pelo motorista ou pelo painel admin), o horário real fica salvo junto —
  aparece como "embarcou HH:MM" ao lado do horário previsto na lista de
  embarque, e alimenta a coluna "Pontualidade" dos Relatórios (atraso médio
  e % de paradas dentro de 5 minutos do previsto). Viagens confirmadas antes
  dessa mudança não têm esse horário real — a coluna mostra "—" pra elas.
- **Relatórios**: seção "Relatórios" — escolha um período (padrão: mês
  atual) e veja, por rota, quantas viagens confirmadas houve, km total,
  custo estimado total, taxa de ocupação média (passageiros ÷ capacidade) e
  pontualidade (ver acima). Os dados vêm só de viagens **confirmadas** (não
  de toda otimização feita).

## Quando cada rota/localização foi criada ou editada

Rotas e localizações têm `createdAt`/`updatedAt` no banco (preenchidos e
atualizados automaticamente pelo Prisma — nenhum formulário pede essa data).
Pra não poluir a lista, isso não aparece como texto fixo — passe o mouse
sobre um item da lista ("Rotas" ou "Locais") pra ver um tooltip com "Criado
em ..." e, se já foi editado depois de criado, "Atualizado em ...".

Como isso foi adicionado numa sessão já com dados reais cadastrados, os
registros que já existiam antes ganharam `createdAt`/`updatedAt` iguais ao
momento da migração (não à data real em que foram criados, que nunca foi
guardada) — só registros criados/editados a partir de agora têm a data real.

## Cache das APIs do Google

Distância/duração (Distance Matrix), trajeto real (Directions) e endereço
(Geocoding) ficam cacheados no próprio banco (`server/src/services/
cachedGoogleMapsClient.ts`), sem TTL de propósito — a distância rodoviária
entre 2 pontos fixos ou o trajeto de uma sequência exata de paradas
praticamente nunca muda. Na prática, reotimizar sem ter mudado
localizações/rotas fica **quase grátis**: nenhuma chamada nova ao Google, só
leituras do SQLite.

- Testado na prática: primeira chamada a `/api/optimize` ~7,6s (bate no
  Google de verdade); segunda chamada idêntica ~1,3s, **sem nenhuma
  chamada nova ao Google** (confirmado pelas linhas das tabelas de cache
  não crescerem). Geocodificação repetida caiu de ~660ms pra ~7ms.
- O endpoint de diagnóstico (`/api/diagnostics/google`, usado no popover de
  configurações) **não usa cache de propósito** — o objetivo dele é testar
  se a chave/API funcionam *agora*; um resultado cacheado mascararia uma
  falha real.
- Sem invalidação automática: se algum dia for preciso forçar uma
  atualização (ex: Google mudou uma rota), limpe as linhas das tabelas
  `distance_cache`, `directions_cache` ou `geocode_cache` via
  `npm run db:studio -w server`.

## Banco de dados

Persistência via **SQLite + Prisma** (`server/prisma/schema.prisma`), em
`server/data/borabora.db`. Antes usávamos um arquivo JSON reescrito por
inteiro a cada mudança — isso perdia dados de verdade se dois processos do
servidor rodassem ao mesmo tempo (cada um com sua cópia em memória, o último
a salvar vencia). O SQLite roda em modo **WAL**, que lida com leituras e
escritas concorrentes com segurança de verdade — testamos isso na prática
(dois processos escrevendo ao mesmo tempo, sem perder nenhuma escrita).

Além de `Location`/`Route`/`Destination`/`Settings`, o schema tem `Trip` +
`TripRoute` + `TripStop` — o histórico de viagens confirmadas (ver seção
acima). Essas tabelas guardam uma **foto** dos dados no momento da
confirmação (nome do motorista, distância, etc.), não uma referência viva à
rota/localização — editar ou excluir uma rota depois não muda o histórico já
confirmado.

**Comandos úteis:**

```bash
npm run db:migrate -w server   # aplica o schema atual (cria o banco se nao existir)
npm run db:studio -w server    # abre uma UI visual pra inspecionar/editar os dados
npm run db:generate -w server  # regenera o Prisma Client (normal apos "npm install")
```

### Migrando para o Neon (Postgres) no futuro

O acesso ao banco fica todo isolado em `server/src/store/*.ts` — o resto do
sistema (rotas, serviços, pipeline) nunca fala com o Prisma diretamente, só
com essas funções. Pra trocar de SQLite pra Neon:

1. Em `server/prisma/schema.prisma`, troque `provider = "sqlite"` por
   `provider = "postgresql"`.
2. Em `server/.env`, troque `DATABASE_URL` pela connection string do Neon
   (formato `postgresql://usuario:senha@host/banco?sslmode=require`).
3. Rode `npm run db:migrate -w server` de novo pra gerar as migrações
   equivalentes em Postgres.
4. Nenhum código em `store/`, `routes/` ou `services/` precisa mudar — as
   queries do Prisma são as mesmas independente do banco por baixo.

## Limitações conhecidas (v1)

- Alocação de localizações às rotas usa uma heurística gulosa (mais próxima
  do depósito com capacidade disponível) seguida de uma melhoria local
  (relocate/swap), não uma otimização global — boa o suficiente para um
  protótipo, mas não garante o ótimo absoluto.
- Autenticação por senha única compartilhada (`APP_PASSWORD`), não contas de
  usuário individuais — veja a seção "Autenticação e rate limiting".
