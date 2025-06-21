// Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  push,
  remove
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBn7_cHGODQgFfuD6r2MlMWSULL62etbKU",
  authDomain: "ranking-time-de-vendas.firebaseapp.com",
  databaseURL: "https://ranking-time-de-vendas-default-rtdb.firebaseio.com",
  projectId: "ranking-time-de-vendas",
  storageBucket: "ranking-time-de-vendas.firebasestorage.app",
  messagingSenderId: "672208349807",
  appId: "1:672208349807:web:491fa63d0736b2c66ffb9a"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const leadsRef = ref(db, "leads");

let leads = {};

onValue(leadsRef, (snapshot) => {
  leads = snapshot.val() || {};
  renderizar();
});

function renderizar() {
  const colunas = ["novo", "distribuido", "acompanhamento", "agendado", "fechado", "perdido"];
  colunas.forEach(id => (document.getElementById(id).innerHTML = ""));
  document.getElementById("totalLeads").textContent = Object.keys(leads).length;
  

  const contagemStatus = {};
  const conversaoConsultor = {};
  const hoje = new Date();
  const proximas = [];

let leadsHoje = 0;
let leadsOntem = 0;

const inicioHoje = new Date();
inicioHoje.setHours(0, 0, 0, 0);

const inicioOntem = new Date(inicioHoje);
inicioOntem.setDate(inicioOntem.getDate() - 1);

Object.values(leads).forEach(lead => {
  const entrada = new Date(lead.dataEntrada);
  if (entrada >= inicioHoje) {
    leadsHoje++;
  } else if (entrada >= inicioOntem && entrada < inicioHoje) {
    leadsOntem++;
  }
});

document.getElementById("leadsHoje").textContent = leadsHoje;
document.getElementById("leadsOntem").textContent = leadsOntem;



  Object.entries(leads).forEach(([id, lead]) => {
    const card = document.createElement("div");
    card.className = "card";
    card.draggable = true;
    card.dataset.id = id;

    const dataLigacao = lead.agendarLigacao
      ? `📅 Ligação: ${formatarData(lead.agendarLigacao)}`
      : "";
    const dataMensagem = lead.agendarMensagem
      ? `💬 Mensagem: ${formatarData(lead.agendarMensagem)}`
      : "";

    card.innerHTML = `
      <strong>${lead.nome}</strong><br>
      📞 ${lead.telefone}<br>
      👤 ${lead.consultor}<br>
      📍 Origem: ${lead.origem || "Não informada"}<br>
      ${lead.dataEntrada ? `🕓 Entrada: ${formatarData(lead.dataEntrada)}<br>` : ""}
      ${dataLigacao ? dataLigacao + "<br>" : ""}
      ${dataMensagem ? dataMensagem + "<br>" : ""}
      📝 ${lead.observacoes || ""}
      <br><button class="excluir">🗑️</button>
    `;

    card.ondragstart = e => e.dataTransfer.setData("id", id);
    card.onclick = () => editarLead(id);

    const btn = card.querySelector("button.excluir");
    btn.onclick = (event) => {
      event.stopPropagation();
      excluirLead(id, event);
    };

    const coluna = document.getElementById(lead.status.toLowerCase());
    if (coluna) coluna.appendChild(card);

    contagemStatus[lead.status] = (contagemStatus[lead.status] || 0) + 1;
    if (lead.status === "Fechado") {
      conversaoConsultor[lead.consultor] = (conversaoConsultor[lead.consultor] || 0) + 1;
    }

    const horas72 = 72 * 60 * 60 * 1000;
    const agendamento = new Date(lead.agendarLigacao);
    if (
      lead.agendarLigacao &&
      !isNaN(agendamento) &&
      agendamento > hoje &&
      agendamento - hoje < horas72
    ) {
      proximas.push(`📅 ${lead.nome} (${lead.consultor}) - ligação às ${agendamento.toLocaleString("pt-BR")}`);
    }

    const dataMsg = new Date(lead.agendarMensagem);
    if (
    lead.agendarMensagem &&
    !isNaN(dataMsg) &&
    dataMsg > hoje &&
    dataMsg - hoje < horas72
    ) {
    proximas.push(`💬 ${lead.nome} (${lead.consultor}) - mensagem às ${dataMsg.toLocaleString("pt-BR")}`);
    }


  });

  document.getElementById("statusCount").innerHTML =
    Object.entries(contagemStatus).map(([s, n]) => `<li>${s}: ${n}</li>`).join("");
  document.getElementById("conversionByConsultant").innerHTML =
    Object.entries(conversaoConsultor).map(([c, n]) => `<li>${c}: ${n} vendas</li>`).join("");
  document.getElementById("proximasAcoes").innerHTML =
    proximas.map(p => `<li>${p}</li>`).join("");

  document.querySelectorAll(".column").forEach(col => {
    col.ondragover = e => e.preventDefault();
    col.ondrop = e => {
      const id = e.dataTransfer.getData("id");
      leads[id].status = col.dataset.status;
      salvarLeads();
    };
  });


  gerarGraficoConversao(contagemStatus);
}

function editarLead(id) {
  const lead = leads[id];
  document.getElementById("editIndex").value = id;
  document.getElementById("editNome").value = lead.nome;
  document.getElementById("editTelefone").value = lead.telefone;
  document.getElementById("editConsultor").value = lead.consultor;
  document.getElementById("editObs").value = lead.observacoes;
  document.getElementById("editStatus").value = lead.status;
  document.getElementById("editLigacao").value = lead.agendarLigacao || "";
  document.getElementById("editMensagem").value = lead.agendarMensagem || "";
  document.getElementById("modalEditar").style.display = "flex";
  document.getElementById("editEntrada").value = lead.dataEntrada || "";

}

function fecharModal() {
  document.getElementById("modalEditar").style.display = "none";
}

document.getElementById("formEditar").onsubmit = e => {
  e.preventDefault();
  const id = document.getElementById("editIndex").value;
  leads[id] = {
    nome: document.getElementById("editNome").value,
    telefone: document.getElementById("editTelefone").value,
    consultor: document.getElementById("editConsultor").value,
    observacoes: document.getElementById("editObs").value,
    status: document.getElementById("editStatus").value,
    agendarLigacao: document.getElementById("editLigacao").value,
    agendarMensagem: document.getElementById("editMensagem").value,
    dataEntrada: document.getElementById("editEntrada").value
  };
  fecharModal();
  salvarLeads(); // ✅ ESSA LINHA PRECISA TER A FUNÇÃO GLOBAL
};


document.getElementById("leadForm").onsubmit = e => {
  e.preventDefault();
  const novoLead = {
    nome: document.getElementById("nome").value,
    telefone: document.getElementById("telefone").value,
    origem: document.getElementById("origem").value,
    consultor: document.getElementById("consultor").value,
    observacoes: document.getElementById("observacoes").value,
    agendarLigacao: document.getElementById("agendarLigacao").value,
    agendarMensagem: document.getElementById("agendarMensagem").value,
    status: "Novo",
    dataEntrada: new Date().toISOString()

  };
  const novoRef = push(leadsRef);
  set(novoRef, novoLead);
  e.target.reset();
};

  function salvarLeads() {
  set(leadsRef, leads)
    .then(() => console.log("Leads atualizados"))
    .catch(err => console.error("Erro ao salvar leads:", err));
}


function excluirLead(id, event) {
  event.stopPropagation();
  if (confirm(`Deseja excluir o lead "${leads[id].nome}"?`)) {
    const leadRef = ref(db, `leads/${id}`);
    remove(leadRef);
  }
}

function exportToCSV() {
  const arrayLeads = Object.values(leads);
  if (!arrayLeads.length) return;
  const header = Object.keys(arrayLeads[0]).join(",");
  const body = arrayLeads.map(o =>
    Object.values(o).map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
  );
  baixarArquivo([header, ...body].join("\n"), "leads.csv", "text/csv");
}

function exportToJSON() {
  baixarArquivo(JSON.stringify(leads, null, 2), "leads.json", "application/json");
}

function baixarArquivo(dados, nome, tipo) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([dados], { type: tipo }));
  link.download = nome;
  link.click();
}

function importFromJSON(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    leads = JSON.parse(reader.result);
    salvarLeads();
  };
  reader.readAsText(file);
}

function formatarData(dataStr) {
  if (!dataStr) return "";
  const dt = new Date(dataStr);
  return isNaN(dt.getTime()) ? "" : dt.toLocaleString("pt-BR");
}


function gerarGraficoConversao(statusData) {
  const ctx = document.getElementById("graficoConversao").getContext("2d");
  if (window.conversaoChart) window.conversaoChart.destroy();
  window.conversaoChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(statusData),
      datasets: [{
        label: "Leads por Status",
        data: Object.values(statusData),
        backgroundColor: ["#2c7be5", "#00d97e", "#e63757", "#fd7e14", "#6c757d", "#5c60f5"]
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
}