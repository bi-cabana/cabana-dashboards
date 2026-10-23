/* ============================================================================
   CABANA BURGER · PORTAL DE CADASTRO CLT
   Mapa dos campos — fonte unica da verdade.

   Tudo que o portal mostra, valida, grava no banco e entrega pronto para
   colar no sistema de admissao sai daqui. Para incluir, tirar ou renomear
   um campo, mexa SO neste arquivo.

   Cada campo:
     k      chave no banco (coluna de cadastros_clt)
     r      rotulo, escrito igual ao do sistema de destino
     t      text | select | date | tel | email | radio | check | textarea
     req    obrigatorio
     span   ocupa a linha inteira do grid
     opts   opcoes, para select e radio
     lista  datalist (sugere sem travar)
     mask   cpf | cep | data | fone | pis | titulo | sus | matricula | num
     hint   texto de apoio abaixo do campo
     ver    funcao(d) -> mostra o campo? (d = o que ja foi preenchido)
   ========================================================================== */

const UF = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
            'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

/* Lista do eSocial, na ordem e com a redacao oficial. */
const GRAU_INSTRUCAO = [
  'Analfabeto, inclusive o que, embora tenha recebido instrução, não se alfabetizou',
  'Até o 5º ano incompleto do ensino fundamental',
  '5º ano completo do ensino fundamental',
  'Do 6º ao 9º ano do ensino fundamental incompleto',
  'Ensino fundamental completo',
  'Ensino médio incompleto',
  'Ensino médio completo',
  'Educação superior incompleta',
  'Educação superior completa',
  'Pós-graduação completa',
  'Mestrado completo',
  'Doutorado completo',
];

const ESTADO_CIVIL = ['SOLTEIRO(A)','CASADO(A)','UNIÃO ESTÁVEL','SEPARADO(A)',
                      'DIVORCIADO(A)','VIÚVO(A)'];

const RACA = ['BRANCA','PRETA','PARDA','AMARELA','INDÍGENA','NÃO INFORMADO'];

const GENERO = ['Homem Cisgênero','Mulher Cisgênero','Homem Transgênero',
                'Mulher Transgênero','Não-binário','Outro','Prefiro não informar'];

const TIPO_PCD = ['Física','Auditiva','Visual','Intelectual','Múltipla',
                  'Reabilitado do INSS'];

const LOGRADOURO = ['Rua','Avenida','Alameda','Praça','Travessa','Rodovia',
                    'Estrada','Viela','Largo','Via','Jardim','Vila','Conjunto'];

const ORGAO_RG = ['SSP','DETRAN','PC','IFP','IML','SDS','PM','MEX','MAE','MAR',
                  'DIC','IPF','POF','CTPS','OAB','CRM','OUTRO'];

/* O salário sai por depósito, em conta corrente ou conta salário — poupança
   e PIX saíram porque a folha não paga por esses meios. */
const MEIO_PAGAMENTO = ['Depósito em conta corrente','Depósito em conta salário'];
const TIPO_CONTA     = ['Conta Corrente','Conta Salário'];

/* A conta da folha é no Itaú. O campo existe para a pessoa ver em qual banco
   a conta vai ser, não para escolher — por isso vem travado e não como lista
   de uma opção só, que convida a procurar outra. */
const BANCO_FOLHA = 'Itaú';

const CONSELHOS = ['Não possui','CRA','CRB','CRC','CREA','CRECI','CREFITO','CRESS',
                   'CRF','CRM','CRMV','CRN','CRO','COREN','CRP','CRQ','OAB','OUTRO'];

const CAT_CNH = ['A','B','AB','C','D','E','ACC'];

/* Numeração brasileira. A calça vai de 2 em 2, como a etiqueta; o calçado
   de 1 em 1. Lista fechada porque é pedido de compra: "38/40" ou "M" na mão
   livre vira retrabalho na hora de encomendar. */
const TAM_CALCA = ['34','36','38','40','42','44','46','48','50','52','54','56'];
const TAM_SAPATO = ['33','34','35','36','37','38','39','40','41','42','43','44','45','46'];

const PARENTESCO = ['Filho(a)','Enteado(a)','Cônjuge','Companheiro(a)',
                    'Pai','Mãe','Tutelado(a)','Outro'];

/* ── auxiliares de condicao ───────────────────────────────────────────────── */
const idadeDe = d => {
  const p = String(d.nascimento || '').split('/');
  if (p.length !== 3 || p[2].length !== 4) return null;
  const n = new Date(+p[2], +p[1] - 1, +p[0]);
  if (isNaN(n)) return null;
  const h = new Date();
  let a = h.getFullYear() - n.getFullYear();
  const m = h.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && h.getDate() < n.getDate())) a--;
  return a;
};
const maiorDe18   = d => (idadeDe(d) ?? 99) >= 18;
const homem       = d => /^Homem/.test(d.identidade_genero || '');
const brasileiro  = d => (d.nac_pais || 'BRASIL').toUpperCase() === 'BRASIL';
const casou       = d => ['CASADO(A)','UNIÃO ESTÁVEL','SEPARADO(A)',
                          'DIVORCIADO(A)','VIÚVO(A)'].includes(d.estado_civil);

/* ── as seis etapas ───────────────────────────────────────────────────────── */
const ETAPAS = [
  {
    n: 1, aba: 'Identificação', ico: '👤',
    titulo: 'Identificação',
    sub: 'Seus dados pessoais, como constam nos documentos.',
    grupos: [
      { campos: [
        { k:'nome',        r:'Nome Completo', t:'text', req:1, span:1,
          ph:'Como está no RG', auto:'name' },
        { k:'nome_social', r:'Nome Social', t:'text', span:1,
          hint:'Para travesti ou transexual — preencha se for o caso' },
        { k:'cpf',         r:'CPF', t:'text', req:1, mask:'cpf', ph:'000.000.000-00' },
        { k:'nascimento',  r:'Data de nascimento', t:'text', req:1, mask:'data',
          ph:'DD/MM/AAAA' },
        { k:'nac_pais',    r:'País de nascimento', t:'text', req:1, lista:'paises',
          valor:'BRASIL' },
        { k:'nac_uf',      r:'UF de nascimento', t:'select', req:1, opts:UF,
          ver: brasileiro },
        { k:'nac_cidade',  r:'Local de nascimento', t:'text', req:1,
          ph:'Cidade onde nasceu' },
        { k:'naturalizado', r:'Naturalizado', t:'radio', req:1,
          opts:['Não','Sim'], ver: d => !brasileiro(d) },
        { k:'data_migracao', r:'Data de migração', t:'text', mask:'data',
          ph:'DD/MM/AAAA', ver: d => d.naturalizado === 'Sim' },
        { k:'grau_instrucao', r:'Grau de instrução', t:'select', req:1, span:1,
          opts:GRAU_INSTRUCAO },
        { k:'estado_civil', r:'Estado civil', t:'select', req:1, opts:ESTADO_CIVIL },
        { k:'nome_mae',    r:'Nome da Mãe', t:'text', req:1, span:1 },
        { k:'nome_pai',    r:'Nome do Pai', t:'text', span:1 },
      ]},
      { titulo: 'Autodeclaração', campos: [
        { k:'raca', r:'Raça', t:'select', req:1, opts:RACA },
        { k:'identidade_genero', r:'Identidade de gênero', t:'select', req:1,
          opts:GENERO },
        { k:'especificacao_genero', r:'Especificação do gênero', t:'text', span:1,
          ver: d => d.identidade_genero === 'Outro' },
        { k:'pcd', r:'Pessoa com deficiência', t:'radio', req:1, opts:['Não','Sim'] },
        { k:'pcd_tipo', r:'Tipo de deficiência', t:'select', opts:TIPO_PCD, req:1,
          ver: d => d.pcd === 'Sim' },
      ]},
    ],
  },

  {
    n: 2, aba: 'Contato', ico: '🏠',
    titulo: 'Endereço e contato',
    sub: 'É por aqui que o RH vai falar com você sobre a admissão.',
    grupos: [
      { titulo: 'Comunicação', campos: [
        { k:'email', r:'E-mail', t:'email', req:1, span:1, auto:'email',
          ph:'seuemail@gmail.com' },
        { k:'tel_celular', r:'Telefone celular', t:'tel', req:1, mask:'fone',
          ph:'(11) 99999-9999' },
        { k:'tel_residencial', r:'Telefone residencial', t:'tel', mask:'fone',
          ph:'(11) 3333-3333' },
      ]},
      { titulo: 'Endereço', campos: [
        { k:'cep', r:'CEP', t:'text', req:1, mask:'cep', ph:'00000-000',
          botao:'🔍 Buscar', acao:'buscarCEP',
          hint:'Clique em Buscar para preencher o resto automaticamente' },
        { k:'end_pais', r:'País', t:'text', lista:'paises', valor:'BRASIL' },
        { k:'end_uf', r:'UF', t:'select', req:1, opts:UF },
        { k:'end_cidade', r:'Cidade', t:'text', req:1 },
        { k:'end_logradouro', r:'Tipo de logradouro', t:'select', opts:LOGRADOURO },
        { k:'endereco', r:'Endereço', t:'text', req:1,
          ph:'Nome da rua, sem o número' },
        { k:'numero', r:'Número', t:'text', req:1, mask:'num',
          ver: d => d.sem_numero !== 'Sim' },
        { k:'sem_numero', r:'Sem número', t:'check' },
        { k:'bairro', r:'Bairro', t:'text', req:1 },
        { k:'complemento', r:'Complemento', t:'text',
          ph:'Apto, bloco, fundos…' },
      ]},
    ],
  },

  {
    n: 3, aba: 'Documentos', ico: '🪪',
    titulo: 'Números dos documentos',
    sub: 'Transcreva os números exatamente como estão nos documentos. '
       + 'Os arquivos em si você anexa na última etapa.',
    grupos: [
      { titulo: 'RG', campos: [
        { k:'rg_numero',  r:'Número', t:'text', req:1 },
        { k:'rg_digito',  r:'Dígito', t:'text' },
        { k:'rg_emissao', r:'Data de emissão', t:'text', mask:'data', ph:'DD/MM/AAAA' },
        { k:'rg_uf',      r:'UF', t:'select', opts:UF },
        { k:'rg_orgao',   r:'Órgão emissor', t:'select', opts:ORGAO_RG },
      ]},
      { titulo: 'Carteira de Trabalho', campos: [
        { k:'ctps_numero',  r:'Número', t:'text',
          hint:'Na CTPS digital, é o seu CPF' },
        { k:'ctps_serie',   r:'Série', t:'text' },
        { k:'ctps_prefixo', r:'Prefixo', t:'text' },
        { k:'ctps_emissao', r:'Data de emissão', t:'text', mask:'data',
          ph:'DD/MM/AAAA' },
        { k:'ctps_uf',      r:'UF', t:'select', opts:UF },
      ]},
      { titulo: 'Título de eleitor', nota:'Obrigatório para maiores de 18 anos',
        ver: maiorDe18, campos: [
        { k:'titulo_numero', r:'Número', t:'text', req:1, mask:'titulo',
          ph:'0000 0000 0000' },
        { k:'titulo_zona',   r:'Zona', t:'text', req:1, mask:'num' },
        { k:'titulo_secao',  r:'Seção', t:'text', req:1, mask:'num' },
        { k:'titulo_uf',     r:'UF', t:'select', req:1, opts:UF },
      ]},
      { titulo: 'Certificado militar',
        nota:'Obrigatório para homens brasileiros maiores de 18 anos',
        ver: d => homem(d) && brasileiro(d) && maiorDe18(d), campos: [
        { k:'militar_numero',    r:'Número', t:'text', req:1 },
        { k:'militar_categoria', r:'Categoria', t:'text', req:1 },
      ]},
      { titulo: 'Carteira de habilitação', nota:'Preencha se tiver', campos: [
        { k:'cnh_numero',    r:'Número', t:'text', mask:'num' },
        { k:'cnh_categoria', r:'Categoria', t:'select', opts:CAT_CNH },
        { k:'cnh_uf',        r:'UF', t:'select', opts:UF },
        { k:'cnh_validade',  r:'Validade', t:'text', mask:'data', ph:'DD/MM/AAAA' },
      ]},
      { titulo: 'Visto estrangeiro', ver: d => !brasileiro(d), campos: [
        { k:'visto_tipo', r:'Tipo', t:'text' },
        { k:'visto_rne',  r:'RNE / RNM', t:'text' },
        { k:'visto_validade_rne',  r:'Validade do RNE', t:'text', mask:'data',
          ph:'DD/MM/AAAA' },
        { k:'visto_validade_prof', r:'Validade profissional', t:'text', mask:'data',
          ph:'DD/MM/AAAA' },
      ]},
      { titulo: 'Conselho de classe', nota:'Só para profissões regulamentadas',
        campos: [
        { k:'conselho_sigla',      r:'Conselho', t:'select', opts:CONSELHOS },
        { k:'conselho_numero',     r:'Número do conselho', t:'text',
          ver: d => d.conselho_sigla && d.conselho_sigla !== 'Não possui' },
        { k:'conselho_vencimento', r:'Vencimento', t:'text', mask:'data',
          ph:'DD/MM/AAAA',
          ver: d => d.conselho_sigla && d.conselho_sigla !== 'Não possui' },
      ]},
    ],
  },

  {
    n: 4, aba: 'Bancário', ico: '🏦',
    titulo: 'Dados bancários',
    sub: 'Nenhum campo desta etapa é obrigatório. Se você já tem conta no '
       + 'Itaú em seu próprio nome, preencha e o salário cai nela desde o '
       + 'primeiro mês. Se não tiver, siga adiante — o RH abre a conta '
       + 'salário com você na admissão.',
    grupos: [
      { campos: [
        { k:'meio_pagamento', r:'Meio de pagamento', t:'select', span:1,
          opts:MEIO_PAGAMENTO },
        { k:'banco',      r:'Banco', t:'text', fixo:1, valor:BANCO_FOLHA, span:1,
          hint:'A folha do Cabana paga no Itaú — por isso o campo vem travado.' },
        { k:'agencia',    r:'Agência', t:'text', ph:'0000' },
        { k:'conta',      r:'Conta', t:'text', ph:'00000000-0' },
        { k:'tipo_conta', r:'Tipo de conta', t:'select', opts:TIPO_CONTA },
      ]},
    ],
  },

  {
    n: 5, aba: 'Benefícios', ico: '🎒',
    titulo: 'Benefícios e dependentes',
    sub: 'Transporte, uniforme e quem você declara como dependente.',
    grupos: [
      { titulo: 'Uniforme', campos: [
        { k:'camiseta', r:'Tamanho da camiseta', t:'select', req:1,
          opts:['PP','P','M','G','GG','XGG'] },
        { k:'calca', r:'Tamanho da calça', t:'select', req:1, opts:TAM_CALCA,
          hint:'Numeração brasileira' },
        { k:'sapato', r:'Numeração do sapato', t:'select', req:1, opts:TAM_SAPATO,
          hint:'Numeração brasileira' },
      ]},
    ],
    extra: 'transporte_dependentes',   // montado a mao, tem linhas dinamicas
  },

  {
    n: 6, aba: 'Anexos', ico: '📎',
    titulo: 'Envio de documentos',
    sub: 'Anexe os documentos abaixo. Eles vão direto e em sigilo para o '
       + 'time de RH do Cabana Burger — não é preciso enviar nada por e-mail.',
    grupos: [],
    extra: 'anexos',
  },
];

/* ── os dez anexos ────────────────────────────────────────────────────────────
   `ver` decide se o documento e exigido daquela pessoa. Quem nao se enquadra
   nem ve o item na tela, e ele nao conta como pendencia.                      */
const DOCS = [
  { k:'cpf', ico:'🧾', nome:'CPF',
    hint:'O cartão do CPF, ou um documento onde o número apareça com clareza' },

  { k:'identidade', ico:'🪪', nome:'RG ou CNH', multi:true,
    hint:'Frente e verso — pode anexar os dois arquivos' },

  { k:'titulo', ico:'🗳️', nome:'Título de eleitor', ver: maiorDe18,
    hint:'Frente e verso, ou o e-Título do app do TSE' },

  { k:'reservista', ico:'🎖️', nome:'Certificado de reservista',
    ver: d => homem(d) && brasileiro(d) && maiorDe18(d),
    hint:'Certificado de dispensa ou de reservista' },

  { k:'residencia', ico:'🏠', nome:'Comprovante de residência',
    hint:'Luz, água, gás ou telefone — emitido nos últimos 3 meses' },

  { k:'ctps', ico:'📘', nome:'Carteira de trabalho',
    hint:'Páginas da foto e da qualificação civil, ou o PDF da CTPS Digital' },

  { k:'certidao', ico:'📜',
    nome: d => casou(d) ? 'Certidão de casamento' : 'Certidão de nascimento',
    hint:'A certidão inteira, legível' },

  { k:'conta_bancaria', ico:'🏦', nome:'Comprovante de conta bancária',
    hint:'Print ou documento do banco mostrando seu nome, agência e conta' },

  { k:'escolaridade', ico:'🎓', nome:'Comprovante de escolaridade',
    ver: d => !/^Analfabeto/.test(d.grau_instrucao || ''),
    hint:'Histórico, certificado ou diploma do grau que você informou' },

  { k:'laudo_pcd', ico:'🩺', nome:'Laudo médico (PCD)',
    ver: d => d.pcd === 'Sim',
    hint:'Laudo com o CID, assinado e carimbado pelo médico' },

  /* `depois` é um documento que não dá para anexar agora: o exame ainda vai
     ser marcado. Ele aparece na lista para a pessoa saber que falta, nasce
     pendente no painel do RH — que é onde o acompanhamento acontece — e não
     entra na conta que trava o envio, porque ninguém pode resolvê-lo hoje. */
  { k:'aso', ico:'🩺', nome:'ASO — exame admissional', depois:true,
    hint:'O RH vai agendar o exame e você recebe a guia. O atestado fica '
       + 'pendente até a clínica entregar.' },
];

/* Rotulo do documento, resolvendo os que mudam de nome conforme o cadastro. */
function nomeDoc(doc, d) {
  return typeof doc.nome === 'function' ? doc.nome(d || {}) : doc.nome;
}

/* Os documentos exigidos DESTA pessoa. */
function docsExigidos(d) {
  return DOCS.filter(x => !x.ver || x.ver(d || {}));
}

/* Os que a pessoa pode anexar hoje, e os que ficam para depois. */
function docsAgora(d)  { return docsExigidos(d).filter(x => !x.depois); }
function docsDepois(d) { return docsExigidos(d).filter(x =>  x.depois); }
