"use strict";

/**
 * Higra Project — demonstração de interface, sem conexão a hardware/API.
 * Integração: substitua INITIAL_PUMPS e simulateReadings por dados do servidor.
 */
const INITIAL_PUMPS = [
  { id: "anfibia", name: "Bomba Anfíbia", short: "Captação e recalque de água", description: "Equipamento para sistemas de captação, transferência e recalque. Acompanhe a saúde geral e os indicadores de funcionamento.", health: 92, flow: 120, pressure: 2.5, temp: 28, image: "https://higra.com.br/wp-content/uploads/2025/11/bomba-anfibia-600.png", fallback: "assets/bomba-anfibia.svg", trend: [87, 89, 90, 89, 92, 91, 92] },
  { id: "submersa", name: "Bomba Submersa", short: "Poços e reservatórios", description: "Indicada para operações submersas em poços e reservatórios. Veja as leituras de vazão, pressão, temperatura e o histórico de saúde.", health: 76, flow: 85, pressure: 3.1, temp: 32, image: "https://higra.com.br/wp-content/uploads/2025/11/bomba-submersa-600.png", fallback: "assets/bomba-submersa.svg", trend: [83, 81, 80, 79, 78, 77, 76] },
  { id: "aerador", name: "Aerador", short: "Aeração de tanques", description: "Sistema de aeração utilizado em tanques e reservatórios. Este equipamento demonstra um aviso para acompanhamento preventivo.", health: 62, flow: 60, pressure: 1.8, temp: 36, image: "https://higra.com.br/wp-content/uploads/2025/11/aerador-600.png", fallback: "assets/aerador.svg", trend: [72, 71, 70, 67, 65, 63, 62] },
  { id: "tga", name: "TGA", short: "Transferência de água", description: "Conjunto de transferência de água com monitoramento de desempenho, grandezas hidráulicas e indicadores de integridade.", health: 88, flow: 95, pressure: 2.9, temp: 30, image: "https://higra.com.br/wp-content/uploads/2025/11/tga-600.png", fallback: "assets/tga.svg", trend: [83, 85, 84, 86, 87, 89, 88] }
];
const NAV = [
  { id: "inicio", label: "Início", icon: "home" },
  { id: "bombas", label: "Bombas", icon: "pump" },
  { id: "graficos", label: "Gráficos", icon: "chart" },
  { id: "relatorios", label: "Relatórios", icon: "file" },
  { id: "alertas", label: "Alertas", icon: "bell" },
  { id: "configuracoes", label: "Configurações", icon: "settings" }
];
const MOBILE_NAV = ["inicio", "bombas", "relatorios", "configuracoes"];
const app = document.getElementById("app-content");
const state = {
  pumps: INITIAL_PUMPS.map(p => ({...p, trend: [...p.trend]})),
  history: [81, 80, 83, 81, 82, 80, 78],
  overallHealth: 78,
  route: "inicio",
  search: "",
  filter: "todos",
  sort: "original",
  alertAcknowledged: false,
  lastUpdated: new Date(),
  settings: { notifications: true },
  toastTimer: null
};

const $ = (s, root=document) => root.querySelector(s);
const ico = (name, className="icon") => `<svg class="${className}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const fmt = (value, dec=0) => Number(value).toLocaleString("pt-BR", {minimumFractionDigits:dec, maximumFractionDigits:dec});
const safe = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const dateShort = (offset=0) => {const d=new Date();d.setDate(d.getDate()+offset);return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short"}).format(d).replace(".","");};
const updatedAt = () => new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(state.lastUpdated);
function statusFor(health) {
  if (health >= 85) return { label: "Estável", key: "good", color: "#12b76a" };
  if (health >= 70) return { label: "Operando", key: "operating", color: "#088bd6" };
  if (health >= 50) return { label: "Atenção", key: "warn", color: "#f3a013" };
  return { label: "Crítico", key: "critical", color: "#c42a36" };
}
function summary() {
  const pumps=state.pumps;
  return { total:pumps.length, operational:pumps.filter(p => p.health>=70).length, attention:pumps.filter(p => p.health>=50&&p.health<70).length, critical:pumps.filter(p => p.health<50).length, stable:pumps.filter(p => p.health>=85).length };
}
function gauge(pct, variant="small") {
  const color=statusFor(pct).color;
  return `<div class="gauge gauge--${variant}" role="img" aria-label="Saúde: ${pct}%" style="--percent:${pct}%;--gauge-color:${color}"><span>${pct}%</span></div>`;
}
function progress(pct) {return `<div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Saúde" style="--percent:${pct}%;--progress-color:${statusFor(pct).color}"><span></span></div>`;}
function pill(pump) {const status=statusFor(pump.health);return `<span class="status-pill ${status.key}">${status.label}</span>`;}
function pumpImg(p, className="") {return `<img class="${className}" src="${p.image}" data-fallback="${p.fallback}" loading="lazy" alt="Equipamento: ${safe(p.name)}">`;}
function metric(label, value) {return `<div class="metric"><small>${label}</small><strong>${value}</strong></div>`;}
function pumpCard(p) {
  return `<article class="pump-card surface" data-pump="${p.id}">
    <div class="pump-product">${pumpImg(p)}</div>
    <div class="pump-identity"><div class="pump-description"><h3>${safe(p.name)}</h3><p>${safe(p.short)}</p>${pill(p)}</div>${gauge(p.health)}</div>
    ${progress(p.health)}
    <div class="pump-metrics">${metric("Vazão",`${fmt(p.flow)} m³/h`)}${metric("Pressão",`${fmt(p.pressure,1)} bar`)}${metric("Temperatura",`${fmt(p.temp)} °C`)}</div>
    <button class="primary-btn" data-action="details" data-id="${p.id}" type="button">Ver detalhes ${ico("arrow")}</button>
  </article>`;
}
function filteredPumps() {
  const term=state.search.trim().toLocaleLowerCase("pt-BR");
  let items=state.pumps.filter(p=>{
    const matchesSearch=`${p.name} ${p.short} ${statusFor(p.health).label}`.toLocaleLowerCase("pt-BR").includes(term);
    const status=statusFor(p.health).key;
    const matchesFilter=state.filter==="todos"|| (state.filter==="operacao" && ["good","operating"].includes(status)) || (state.filter==="atencao" && status==="warn") || (state.filter==="critico" && status==="critical");
    return matchesSearch&&matchesFilter;
  });
  if(state.sort==="low") items=items.sort((a,b)=>a.health-b.health);
  if(state.sort==="high") items=items.sort((a,b)=>b.health-a.health);
  if(state.sort==="az") items=items.sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
  return items;
}
function pumpList() {
  const pumps=filteredPumps();
  return pumps.length ? pumps.map(pumpCard).join("") : `<div class="empty-state surface">${ico("search")}<h3>Nenhuma bomba encontrada</h3><p>Tente outro nome ou ajuste o filtro selecionado.</p><button type="button" class="secondary-btn" data-action="clear-filters">Limpar pesquisa e filtros</button></div>`;
}
function demoStrip() {return `<div class="demo-strip"><span class="demo-label">${ico("info")} Dados demonstrativos, não são leituras reais</span><span class="updated">${ico("clock")} ${safe(updatedAt())}</span></div>`;}
function hero() {
  const s=summary();
  return `<section class="hero surface" aria-label="Avaliação geral das bombas">
    <div><h1 class="hero-title">Avaliação Geral</h1><p class="hero-sub">Saúde geral do sistema de bombas</p></div>
    <div class="hero-health">${gauge(state.overallHealth,"large")}</div>
    <div class="hero-message"><h3>${state.overallHealth>=70?"Sistema em boas condições":"Sistema requer atenção"}</h3><p>${s.critical?"Há equipamentos em estado crítico que exigem atenção.":"A maioria das bombas está operando normalmente."}</p>
       <div class="hero-indicators"><span class="small-indicator"><span class="indicator-dot"></span><b>${s.total}</b> Monitoradas</span><span class="small-indicator"><span class="indicator-dot good"></span><b>${s.operational}</b> Em operação</span><span class="small-indicator"><span class="indicator-dot warn"></span><b>${s.attention}</b> Em atenção</span><span class="small-indicator"><span class="indicator-dot critical"></span><b>${s.critical}</b> Críticas</span></div>
    </div>
  </section>`;
}
function statTiles() {
  const s=summary();
  const list=[{label:"Bombas monitoradas",n:s.total,icon:"pump",cls:""},{label:"Em operação",n:s.operational,icon:"check",cls:"good"},{label:"Em atenção",n:s.attention,icon:"alert",cls:"warn"},{label:"Estado crítico",n:s.critical,icon:"alert",cls:"critical"}];
  return `<section class="stats-grid" aria-label="Indicadores dos equipamentos">${list.map(i=>`<div class="stat-tile surface"><span class="stat-icon ${i.cls}">${ico(i.icon)}</span><div><strong>${i.n}</strong><p>${i.label}</p></div></div>`).join("")}</section>`;
}
function barChart(data) {
  return `<div class="bar-chart" role="img" aria-label="Gráfico dos últimos sete dias: ${data.map(v=>v+'%').join(', ')}"><div class="bar-y"><span>100%</span><span>50%</span><span>0%</span></div><div class="bar-plot">${data.map((val,i)=>`<div class="bar-col"><div class="bar-body" data-value="${val}%" style="--bar-height:${val}%" title="${dateShort(i-6)}: ${val}%"></div><span class="bar-date">${dateShort(i-6)}</span></div>`).join("")}</div></div>`;
}
function donutPanel() {
  const s=summary(), good=s.operational/s.total*100, attention=s.attention/s.total*100;
  const bg=`conic-gradient(#1bad68 0 ${good}%,#f3aa27 ${good}% ${good+attention}%,#c42a36 ${good+attention}% 100%)`;
  return `<section class="analytics-panel surface"><h3 class="panel-title">Status das Bombas</h3><p class="panel-subtitle">Distribuição por nível de saúde</p><div class="status-panel-inner"><div class="legend">
  <span class="legend-item"><i class="legend-color" style="background:#1bad68"></i>Em operação <b>${s.operational}</b></span>
  <span class="legend-item"><i class="legend-color" style="background:#f3aa27"></i>Atenção <b>${s.attention}</b></span>
  <span class="legend-item"><i class="legend-color" style="background:#c42a36"></i>Crítico <b>${s.critical}</b></span>
  </div><div class="status-donut" style="background:${bg}" role="img" aria-label="${s.operational} operando, ${s.attention} em atenção, ${s.critical} críticos"><div class="status-donut-inner"><b>${s.total}</b><small>Total</small></div></div></div></section>`;
}
function historyPanel() {return `<section class="analytics-panel surface"><h3 class="panel-title">Histórico de Saúde</h3><p class="panel-subtitle">Evolução da saúde geral do sistema (últimos 7 dias)</p>${barChart(state.history)}</section>`;}
function comparePanel() {return `<section class="analytics-panel surface"><h3 class="panel-title">Comparativo de Bombas</h3><p class="panel-subtitle">Saúde atual de cada equipamento</p><div class="table-scroll"><table class="compare-table"><thead><tr><th>Bomba</th><th>Saúde</th><th>Status</th></tr></thead><tbody>${state.pumps.map(p=>`<tr><td>${safe(p.name)}</td><td><div class="table-pct">${p.health}% ${progress(p.health)}</div></td><td><span class="table-status" style="--dot:${statusFor(p.health).color}">${statusFor(p.health).label}</span></td></tr>`).join("")}</tbody></table></div></section>`;}
function analytics() {return `<div class="analytics-grid">${donutPanel()}${historyPanel()}${comparePanel()}</div>`;}
function pumpSection(title, description, showAll=false) {
  return `<section aria-label="Bombas monitoradas"><div class="content-head"><div><h2>${title}</h2><p>${description} <span id="filter-count"></span></p></div>${showAll?`<button type="button" class="text-action" data-route="bombas">Ver todas as bombas ${ico("chevron")}</button>`:""}</div><div id="pump-list" class="pump-grid">${pumpList()}</div></section>`;
}
function dashboard() {
  return `${demoStrip()}${hero()}${statTiles()}${pumpSection("Bombas Monitoradas","Selecione uma bomba para consultar os detalhes.",true)}${analytics()}`;
}
function pumpsPage() {
  return `${demoStrip()}<div class="simple-head"><div><span class="eyebrow">EQUIPAMENTOS</span><h1 class="page-heading">Bombas Monitoradas</h1><p class="lead">Consulte e compare os indicadores de todos os equipamentos.</p></div><button class="secondary-btn" type="button" data-action="simulate">${ico("refresh")} Simular leitura</button></div>
  <div class="filter-toolbar" role="group" aria-label="Filtrar bombas">${[{id:"todos",label:"Todas"},{id:"operacao",label:"Em operação"},{id:"atencao",label:"Atenção"},{id:"critico",label:"Críticas"}].map(f=>`<button type="button" data-action="filter" data-filter="${f.id}" class="filter-chip ${state.filter===f.id?"active":""}">${f.label}</button>`).join("")}
   <select class="sort-select" id="sort-select" aria-label="Ordenar bombas"><option value="original">Ordenar: padrão</option><option value="high">Maior saúde primeiro</option><option value="low">Menor saúde primeiro</option><option value="az">Nome (A–Z)</option></select>
  </div><div class="pump-grid" id="pump-list">${pumpList()}</div>`;
}
function lineChart(data){
  const width=680,height=235,x0=39,plotW=610,top=22,plotH=166;
  const coords=data.map((v,i)=>[x0+(plotW*i/(data.length-1)),top+plotH-(plotH*v/100)]);
  const points=coords.map(v=>v.join(",")).join(" ");
  const area=`M${coords[0][0]} ${top+plotH} L${coords.map(p=>p.join(" ")).join(" L")} L${coords.at(-1)[0]} ${top+plotH} Z`;
  return `<svg class="line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Histórico de saúde: ${data.join(', ')} por cento"><defs><linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#11a9ef" stop-opacity=".22"/><stop offset="1" stop-color="#11a9ef" stop-opacity="0"/></linearGradient></defs>
  ${[0,50,100].map(v=>{const y=top+plotH-(v*plotH/100);return `<line class="grid" x1="39" y1="${y}" x2="649" y2="${y}"/><text class="axis-label" x="30" y="${y+4}" text-anchor="end">${v}%</text>`;}).join("")}
  <path class="area" d="${area}"/><polyline class="line" points="${points}"/>${coords.map(([x,y],i)=>`<circle class="point" cx="${x}" cy="${y}" r="4.5"><title>${dateShort(i-6)}: ${data[i]}%</title></circle><text class="axis-label" x="${x}" y="221" text-anchor="middle">${dateShort(i-6)}</text>`).join("")}</svg>`;
}
function detailsPage(id) {
  const p=state.pumps.find(p=>p.id===id);if(!p)return `<div class="empty-state surface"><h3>Bomba não encontrada</h3><button class="secondary-btn" data-route="bombas">Voltar às bombas</button></div>`;
  const status=statusFor(p.health);
  const segments=Array.from({length:20},(_,i)=>`<span class="${i<Math.round(p.health/5)?`filled ${status.key}`:""}"></span>`).join("");
  return `${demoStrip()}<div class="detail-topbar"><button class="back-btn" type="button" data-route="bombas">${ico("back")} Voltar para bombas</button><button type="button" data-action="simulate" class="secondary-btn">${ico("refresh")} Atualizar simulação</button></div>
  <section class="detail-hero surface"><div>${pumpImg(p,"detail-image")}</div><div class="detail-info"><span class="eyebrow">MONITORAMENTO INDIVIDUAL</span><h1>${safe(p.name)}</h1><p>${safe(p.short)}</p>${pill(p)}<p class="description">${safe(p.description)}</p></div><div class="detail-gauge">${gauge(p.health,"large")}</div></section>
  <section class="detail-metrics" aria-label="Medições da bomba"><div class="detail-metric surface">${ico("waves")}<small>Vazão</small><strong>${fmt(p.flow)} m³/h</strong></div><div class="detail-metric surface">${ico("gauge")}<small>Pressão</small><strong>${fmt(p.pressure,1)} bar</strong></div><div class="detail-metric surface">${ico("temp")}<small>Temperatura</small><strong>${fmt(p.temp)} °C</strong></div></section>
  <section class="detail-chart-grid"><div class="detail-panel surface"><h2 class="panel-title">Evolução da saúde</h2><p class="panel-subtitle">Indicadores demonstrativos dos últimos 7 dias</p>${lineChart(p.trend)}</div>
  <div class="detail-panel surface"><h2 class="panel-title">Avaliação específica</h2><p class="panel-subtitle">Nível estimado de saúde do equipamento</p><div class="health-segments" aria-label="${p.health}% de saúde">${segments}</div><div class="mini-label">${pill(p)} <strong>${p.health}%</strong></div><p class="health-tip">Esta avaliação é um exemplo visual. Em produção, os limites de saúde e os alertas devem ser definidos pela equipe técnica conforme o equipamento.</p><button class="secondary-btn" data-route="graficos" type="button">${ico("chart")} Ver gráficos gerais</button></div></section>
  <div class="content-head"><div><h2>Comparativo com outras bombas</h2><p>Visão conjunta dos indicadores demonstrativos.</p></div></div><section class="analytics-panel surface">${comparePanelTableOnly()}</section>`;
}
function comparePanelTableOnly(){return `<div class="table-scroll"><table class="report-table"><thead><tr><th>Equipamento</th><th>Saúde</th><th>Vazão</th><th>Pressão</th><th>Temperatura</th><th>Situação</th></tr></thead><tbody>${state.pumps.map(p=>`<tr><td>${safe(p.name)}</td><td><b>${p.health}%</b></td><td>${fmt(p.flow)} m³/h</td><td>${fmt(p.pressure,1)} bar</td><td>${fmt(p.temp)} °C</td><td>${pill(p)}</td></tr>`).join("")}</tbody></table></div>`;}
function graphsPage(){return `${demoStrip()}<div class="simple-head"><div><span class="eyebrow">ANÁLISES</span><h1 class="page-heading">Gráficos e indicadores</h1><p class="lead">Visualização histórica e distribuição de saúde dos equipamentos.</p></div><button class="secondary-btn" data-action="simulate" type="button">${ico("refresh")} Simular leitura</button></div>
   <section class="detail-chart-grid"><div class="detail-panel surface"><h2 class="panel-title">Histórico geral da saúde</h2><p class="panel-subtitle">Últimos 7 dias</p>${lineChart(state.history)}</div><div class="detail-panel surface"><h2 class="panel-title">Distribuição dos equipamentos</h2><p class="panel-subtitle">Status atual dos equipamentos</p><div style="margin-top:15px">${donutPanel()}</div></div></section>${analytics()}`;}
function reportsPage(){return `${demoStrip()}<div class="simple-head"><div><span class="eyebrow">DADOS</span><h1 class="page-heading">Relatórios</h1><p class="lead">Consolidação dos indicadores demonstrativos das bombas.</p></div><button class="primary-btn" type="button" data-action="export">${ico("download")} Exportar CSV</button></div>
  <div class="notice">${ico("info")} O arquivo CSV contém apenas os dados de exemplo exibidos nesta tela. Nenhum dado foi obtido de bombas reais.</div>
  <section class="surface report-panel"><h2 class="panel-title">Resumo dos equipamentos</h2>${comparePanelTableOnly()}</section>${analytics()}`;}
function alertsPage(){const attention=state.pumps.filter(p=>p.health<70);return `${demoStrip()}<div class="simple-head"><div><span class="eyebrow">ACOMPANHAMENTO</span><h1 class="page-heading">Alertas</h1><p class="lead">Equipamentos que precisam de atenção em nossa demonstração.</p></div><button class="secondary-btn" data-action="ack" type="button">${ico("check")} Marcar como visto</button></div>
 <div class="alerts-list">${attention.length?attention.map(p=>`<article class="alert-item surface"><span class="alert-symbol">${ico("alert")}</span><div><h3>${safe(p.name)} — ${statusFor(p.health).label}</h3><p>Indicador de saúde em ${p.health}%. Verifique os dados do equipamento nesta simulação.</p><span class="status-pill ${statusFor(p.health).key}" style="margin-top:10px">${state.alertAcknowledged?"Visualizado":"Aguardando análise"}</span></div><button class="secondary-btn" data-action="details" data-id="${p.id}" type="button">Ver bomba ${ico("chevron")}</button></article>`).join(""):`<div class="empty-state surface">${ico("check")}<h3>Nenhum alerta no momento</h3><p>Todos os equipamentos estão acima do limite demonstrativo de atenção.</p></div>`}</div>`;}
function settingsPage(){return `${demoStrip()}<div class="simple-head"><div><span class="eyebrow">PREFERÊNCIAS</span><h1 class="page-heading">Configurações</h1><p class="lead">Preferências desta demonstração local.</p></div></div>
 <section class="setting-list"><div class="setting-row surface"><div><h3>Mostrar notificações</h3><p>Exibir aviso numérico no ícone do sino quando houver alerta não visualizado.</p></div><label class="toggle"><input type="checkbox" data-setting="notifications" ${state.settings.notifications?"checked":""} aria-label="Mostrar notificações"><span></span></label></div>
 <div class="setting-row surface"><div><h3>Restaurar dados demonstrativos</h3><p>Retorna os valores e indicadores originais desta apresentação.</p></div><button class="secondary-btn" data-action="reset" type="button">${ico("refresh")} Restaurar</button></div>
 <div class="setting-row surface"><div><h3>Integração com API</h3><p>Em desenvolvimento: substitua os dados de exemplo em app.js para receber leituras reais de seu backend.</p></div><span class="demo-label">${ico("info")} Não conectada</span></div></section>`;}

function navRender(){
  const active=state.route.startsWith("detalhes/")?"bombas":state.route;
  $("#desktop-nav").innerHTML=NAV.map(item=>`<button class="nav-link ${item.id===active?"is-active":""}" type="button" data-route="${item.id}" ${item.id===active?'aria-current="page"':''}>${ico(item.icon)}<span>${item.label}</span>${item.id==="alertas"&&unreadCount()>0?`<span class="nav-badge">${unreadCount()}</span>`:""}</button>`).join("");
  $("#mobile-nav").innerHTML=MOBILE_NAV.map(id=>{const item=NAV.find(n=>n.id===id);return `<button type="button" data-route="${id}" class="bottom-link ${id===active?"is-active":""}" ${id===active?'aria-current="page"':''}>${ico(item.icon)}<span>${item.label}</span></button>`;}).join("");
}
function unreadCount(){return state.settings.notifications&&!state.alertAcknowledged?state.pumps.filter(p=>p.health<70).length:0;}
function applyImageFallbacks(){app.querySelectorAll("img[data-fallback]").forEach(img=>{img.addEventListener("error",()=>{if(!img.src.endsWith(img.dataset.fallback))img.src=img.dataset.fallback;},{once:true});});}
function render(){
  state.route=(location.hash.replace(/^#/,"")||"inicio").split("?")[0];
  if(!NAV.some(n=>n.id===state.route)&&!state.route.startsWith("detalhes/"))state.route="inicio";
  const t={inicio:"Visão geral",bombas:"Bombas",graficos:"Gráficos",relatorios:"Relatórios",alertas:"Alertas",configuracoes:"Configurações"};
  $("#header-title").textContent=t[state.route]||"Detalhes da bomba";
  $("#notification-count").textContent=String(unreadCount());
  $("#notification-count").style.display=unreadCount()?"grid":"none";
  navRender();
  let html="";
  switch(state.route){case"inicio":html=dashboard();break;case"bombas":html=pumpsPage();break;case"graficos":html=graphsPage();break;case"relatorios":html=reportsPage();break;case"alertas":html=alertsPage();break;case"configuracoes":html=settingsPage();break;default:html=detailsPage(state.route.split("/")[1]);}
  app.innerHTML=html;
  $("#global-search").value=state.search;$("#mobile-search").value=state.search;
  if($("#sort-select"))$("#sort-select").value=state.sort;
  applyImageFallbacks();updateCount();
}
function updateCount(){const count=$("#filter-count");if(count)count.textContent=state.search?`· ${filteredPumps().length} resultado(s)`:"";}
function updatePumpList(){const list=$("#pump-list");if(!list)return;list.innerHTML=pumpList();applyImageFallbacks();updateCount();}
function go(route){if(location.hash==="#"+route){render();window.scrollTo({top:0,behavior:"smooth"});}else{location.hash=route;}}
let toastTimer;
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),3200);}
function simulateReadings(){
  state.pumps=state.pumps.map(p=>{const change=Math.floor(Math.random()*7)-3;const health=Math.max(25,Math.min(99,p.health+change));return {...p,health,flow:Math.max(0,p.flow+Math.floor(Math.random()*7)-3),pressure:Math.max(0,Math.round((p.pressure+(Math.random()-.5)*.2)*10)/10),temp:Math.max(0,p.temp+Math.floor(Math.random()*3)-1),trend:[...p.trend.slice(1),health]};});
  state.overallHealth=Math.round(state.pumps.reduce((sum,p)=>sum+p.health,0)/state.pumps.length-1.5);
  state.history=[...state.history.slice(1),state.overallHealth];state.lastUpdated=new Date();state.alertAcknowledged=false;
  render();toast("Dados de demonstração atualizados. Nenhuma bomba real foi consultada.");
}
function reset(){state.pumps=INITIAL_PUMPS.map(p=>({...p,trend:[...p.trend]}));state.history=[81,80,83,81,82,80,78];state.overallHealth=78;state.lastUpdated=new Date();state.alertAcknowledged=false;state.search="";state.filter="todos";state.sort="original";render();toast("Indicadores demonstrativos restaurados.");}
function exportCSV(){
  const rows=[["Bomba","Saúde (%)","Status","Vazão (m³/h)","Pressão (bar)","Temperatura (°C)","Observação"],...state.pumps.map(p=>[p.name,p.health,statusFor(p.health).label,p.flow,fmt(p.pressure,1),p.temp,"DADOS DEMONSTRATIVOS"])];
  const csv="\ufeff"+rows.map(row=>row.map(x=>`"${String(x).replaceAll('"','""')}"`).join(";")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download="higra-relatorio-demonstrativo.csv";document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast("Relatório demonstrativo gerado em CSV.");
}
function events(){
  document.addEventListener("click",e=>{
    const target=e.target.closest("[data-action], [data-route]");if(!target)return;
    if(target.matches("a"))e.preventDefault();
    if(target.dataset.route){go(target.dataset.route);return;}
    switch(target.dataset.action){
      case"details":go("detalhes/"+target.dataset.id);break;
      case"filter":state.filter=target.dataset.filter;render();break;
      case"clear-filters":state.filter="todos";state.search="";render();break;
      case"simulate":simulateReadings();break;
      case"reset":reset();break;
      case"export":exportCSV();break;
      case"ack":state.alertAcknowledged=true;render();toast("Alertas marcados como visualizados.");break;
    }
  });
  document.addEventListener("input",e=>{
    if(!["global-search","mobile-search"].includes(e.target.id))return;
    state.search=e.target.value;
    const other=e.target.id==="global-search"?$("#mobile-search"):$("#global-search");if(other)other.value=state.search;
    if(!["inicio","bombas"].includes(state.route)){go("bombas");return;}updatePumpList();
  });
  document.addEventListener("change",e=>{
    if(e.target.id==="sort-select"){state.sort=e.target.value;updatePumpList();}
    if(e.target.dataset.setting==="notifications"){state.settings.notifications=e.target.checked;render();toast("Preferência de notificações atualizada.");}
  });
  window.addEventListener("hashchange",()=>{render();window.scrollTo({top:0,behavior:"instant"});});
}
$("#year").textContent=new Date().getFullYear();events();render();
