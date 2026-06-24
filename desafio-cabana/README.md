# 🍔 Desafio Cabana

Jogo web mobile gamificado da rede **Cabana Burger**. 10 fases, 3 tipos de desafio, sistema de XP, recompensas e medalhas. Roda direto no navegador do celular, sem instalação. Apenas HTML, CSS e JavaScript puro.

---

## 1. Estrutura dos arquivos

```
desafio-cabana/
├── index.html   → marcação das telas (home, fases, jogo, recompensas, ranking, medalhas, overlay)
├── style.css    → identidade visual (preto/branco/dourado/vermelho), responsivo mobile, animações
└── script.js    → toda a lógica do jogo
```

**Como o `script.js` está organizado** (cada bloco tem comentário no código):

1. **Dados / Config** — ingredientes, definição das 10 fases, recompensas, medalhas, ranking mockado.
2. **Estado + localStorage** — carrega/salva progresso, fase atual, pontos, XP, estrelas, recompensas.
3. **Mascote (Guinho)** — desenhado em SVG inline (hambúrguer andante com sinais de paz e tênis rosa), inspirado na imagem enviada. Como é vetorial, não depende de nenhum arquivo de imagem externo.
4. **Utilitários** — seletores, embaralhamento, toast, confete.
5. **Roteador de telas + HUD**.
6. **Seleção de fase** — grade com bloqueio/desbloqueio e estrelas.
7. **Motor Montador** (fases 1-3) — memorize o pedido e reproduza a ordem.
8. **Motor Coleta** (fases 4-6) — itens caindo, controles esquerda/direita, vidas.
9. **Motor Cabana Rush** (fases 7-10) — atenda clientes antes que percam a paciência.
10. **Recompensas / Ranking / Medalhas**.
11. **Fim de fase** — vitória, derrota, tela de prêmio.
12. **Inicialização**.

As 3 fases foram montadas como **classes reutilizáveis** (`BuilderGame`, `CatcherGame`, `RushGame`) com a mesma interface (`start()` / `destroy()`), facilitando adicionar novos tipos de desafio.

### Como evoluir a dificuldade ou adicionar fases
Basta editar o array `LEVELS` no topo do `script.js`. Cada objeto controla quantidade de ingredientes, velocidade, metas, tempo e número de clientes. Para uma nova fase, adicione um item ao array — o resto (desbloqueio, estrelas, progresso) é automático.

---

## 2. Como publicar gratuitamente

O jogo é 100% estático (sem servidor), então qualquer hospedagem de arquivos estáticos serve. Opções gratuitas:

**Netlify Drop (mais rápido)** — acesse `app.netlify.com/drop` e arraste a pasta com os 3 arquivos. Sai no ar em segundos com um link público.

**GitHub Pages** — crie um repositório, suba `index.html`, `style.css` e `script.js`, vá em *Settings → Pages*, selecione a branch `main` e a pasta raiz. O jogo fica em `https://seu-usuario.github.io/desafio-cabana`.

**Vercel** — `vercel.com`, importe o repositório ou faça upload; deploy automático.

Para usar um domínio próprio (ex.: `jogo.cabanaburger.com.br`), todas as três permitem apontar um domínio customizado nas configurações de DNS.

> Dica: como é instalável como atalho na tela inicial do celular (PWA), basta futuramente adicionar um `manifest.json` e um service worker para virar um "app" sem loja.

---

## 3. Como conectar futuramente com Supabase

Hoje o progresso vive só no `localStorage` do aparelho. Para sincronizar entre dispositivos e ter ranking real, o [Supabase](https://supabase.com) (gratuito até um bom volume) é uma ótima escolha.

**Passos:**

1. Crie um projeto no Supabase e duas tabelas, por exemplo:
   - `players` (id, telefone/email, nome, pontos, xp, criado_em)
   - `progress` (player_id, fase, estrelas, concluida_em)
2. Adicione o SDK no `index.html`:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   ```
3. Inicialize o cliente no `script.js`:
   ```js
   const supabase = supabase.createClient('SUA_URL', 'SUA_ANON_KEY');
   ```
4. **Ponto-chave**: as funções `loadState()` e `saveState()` já centralizam toda a persistência. Basta trocar o conteúdo delas para ler/gravar no Supabase em vez do `localStorage` (mantendo o `localStorage` como cache offline). Nenhuma outra parte do jogo precisa mudar.
   ```js
   async function saveState(){
     localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); // cache local
     await supabase.from('players').upsert({ id: playerId, pontos: state.points, xp: state.xp });
   }
   ```
5. Use o **Auth** do Supabase (login por telefone/SMS ou e-mail) para identificar o cliente — o mesmo identificador usado no CRM da Cabana.
6. O ranking deixa de ser mockado: troque `MOCK_RANKING` por uma query `select ... order by pontos desc limit 10`.

---

## 4. Como emitir cupons reais em versões futuras

A estrutura já está preparada: cada recompensa em `REWARDS` tem um campo `couponCode` (hoje um placeholder de demonstração). O caminho para cupons reais:

1. **Gerar cupom único no backend** (Supabase Edge Function ou o sistema de CRM/PDV da Cabana). Quando o jogador desbloqueia a recompensa, o app chama a função, que cria um cupom de uso único com validade e o vincula ao cliente.
   ```js
   // no finishLevel(), ao desbloquear a recompensa:
   const { data } = await supabase.functions.invoke('gerar-cupom', {
     body: { playerId, reward: reward.couponCode }
   });
   reward.realCode = data.codigo; // ex.: "CABANA-9F3K2X"
   ```
2. **Exibir como QR Code / código** na tela de prêmio (o overlay já mostra o código; basta renderizar um QR com uma lib leve ou uma API de QR).
3. **Validar no balcão**: o atendente lê o QR no sistema de PDV, que marca o cupom como utilizado. Isso evita reuso e fraude.
4. **Integração com CRM**: cada resgate alimenta o histórico do cliente, permitindo campanhas (pontos Cabana, fidelidade, etc.).

Pontos de atenção para produção: validade dos cupons, limite de resgates por cliente, prevenção de fraude (cupom de uso único validado no servidor — nunca confie só no front-end) e regras de negócio (ex.: "hambúrguer grátis" exige consumo mínimo).

---

## 5. O que já está implementado (MVP)

- ✅ Tela inicial com o mascote Guinho animado
- ✅ Sistema de progressão com bloqueio/desbloqueio sequencial
- ✅ As 10 fases (3 montador + 3 coleta + 4 atendimento)
- ✅ Sistema de XP e nível do jogador
- ✅ Pontos totais e estrelas por fase
- ✅ Recompensas mockadas com estrutura para cupons reais
- ✅ Medalhas (Mestre dos Smashes, Rei do Bacon, Atendimento Perfeito, Lenda Cabana)
- ✅ Ranking local (mockado)
- ✅ Salvamento automático em `localStorage`
- ✅ Interface responsiva mobile com animações e feedback de acerto/erro
- ✅ Código comentado e pronto para publicação

---

## Como rodar localmente
Abra o `index.html` direto no navegador. Para testar no celular, sirva a pasta (ex.: `npx serve` ou `python -m http.server`) e acesse o IP da máquina pelo celular na mesma rede.
