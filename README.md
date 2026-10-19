# Higra Project — frontend demonstrativo

Interface responsiva inspirada nos mockups para computador e celular e no PDF de referência. Projeto em **HTML, CSS e JavaScript puro**, sem dependências de build.

## Executar

Abra `index.html` no navegador. Para executar com servidor local (recomendado):

```sh
python -m http.server 8080
```

Depois acesse http://localhost:8080

## Funcionalidades

- Dashboard adaptável a desktop/tablet/celular.
- Quatro equipamentos com imagens externas indicadas no PDF (e ilustrações locais de fallback).
- Pesquisa por nome e descrição, filtro por status e ordenação.
- Páginas de bombas, gráficos, relatórios, alertas, configurações e detalhes individuais.
- Gráficos e indicadores SVG/CSS, sem biblioteca externa.
- Simulação de atualização dos indicadores e exportação CSV.

## Integração com dados reais

Os dados atuais são **fictícios/demonstrativos**, não constituem informações reais dos equipamentos. Em `app.js`, substitua a constante `INITIAL_PUMPS` e a função `simulateReadings()` por chamadas autenticadas à API. A lógica de renderização fica desacoplada dos dados. Não insira credenciais diretamente no JavaScript entregue ao navegador.

## Identidade visual

- Azul escuro: `#162983`
- Azul claro: `#009EE0`
- Azul médio: `#0F6CB0`
- Branco: `#FFFFFF`
- Vermelho de alerta: `#A60F0C`
- Fontes: Montserrat / Poppins (com fontes de sistema como fallback)

Imagens de produtos: links disponibilizados no documento Higra. O funcionamento dessas imagens externas depende do site original e de uma conexão com a internet; em caso de erro, são exibidas ilustrações locais.
