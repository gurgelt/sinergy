/**
 * js/diretoria.js - Painel Executivo
 */

document.addEventListener('DOMContentLoaded', () => {
    const role = (window.getLoggedInUserRole() || '').toLowerCase();
    // Verifica permissão (admin, diretor ou administrador)
    if (role !== 'admin' && role !== 'diretor' && role !== 'administrador') {
        alert('Acesso restrito.');
        window.location.href = '../index.html';
        return;
    }
    initDiretoria();
});

const API_URL = 'https://virtualcriacoes.com/api';
let charts = {}; 

async function initDiretoria() {
    const dataEl = document.getElementById('data-hoje');
    if(dataEl) dataEl.textContent = new Date().toLocaleDateString('pt-BR');
    
    // Configura modal de detalhes
    const modalDet = document.getElementById('modal-detalhes-solicitacao');
    if (modalDet) {
        modalDet.querySelector('.close-modal')?.addEventListener('click', () => modalDet.classList.remove('active'));
        modalDet.querySelector('.btn-secondary')?.addEventListener('click', () => modalDet.classList.remove('active'));
    }

    await loadDashboardData();
    
    // CORREÇÃO DO ERRO: Verifica se o loader ainda existe antes de acessar o estilo
    const loader = document.getElementById('loader-overlay');
    if (loader) loader.style.display = 'none';
}

async function loadDashboardData() {
    try {
        const res = await fetch(`${API_URL}/diretoria/dashboard`);
        if (!res.ok) throw new Error('Falha na API');
        const data = await res.json();

        updateKPIs(data);
        renderApprovalList(data.pendencias);
        renderAllCharts(data);
        renderLists(data);

    } catch (e) {
        console.error(e);
        // Só mostra erro se o NotificationManager estiver carregado
        if(window.NotificationManager) NotificationManager.show({ title: 'Erro', message: 'Erro ao carregar dashboard', type: 'error' });
    }
}

function updateKPIs(data) {
    // Helpers para atualizar texto com segurança
    const setText = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };

    setText('kpi-saldo', formatCurrency(data.financeiro.saldo));
    setText('kpi-a-pagar', formatNumber(data.financeiro.aPagar));
    setText('kpi-a-receber', formatNumber(data.financeiro.aReceber));
    setText('kpi-pedidos-abertos', data.comercial.pedidosAbertos);
    setText('kpi-faturamento', formatCurrency(data.comercial.faturamentoTotal));
    setText('kpi-funcionarios', data.rh.qtdFuncionarios);
    setText('kpi-custo-func', formatCurrency(data.rh.custoMedio));
    setText('kpi-manutencao-ativa', data.manutencao.emAndamento);
    setText('kpi-compras-aguardando', data.compras.aguardando);
}

function renderApprovalList(lista) {
    const container = document.getElementById('approval-list');
    const badge = document.getElementById('count-pendencias');
    if(!container) return;
    
    container.innerHTML = '';
    
    // Filtra Compras e Orçamentos
    const itens = lista.filter(i => i.Tipo === 'Compra' || i.Tipo === 'Orcamento');
    if(badge) badge.textContent = itens.length;

    if (itens.length === 0) {
        container.innerHTML = '<div class="empty-state-dir">Nenhuma pendência.</div>';
        return;
    }

    itens.forEach(item => {
        const div = document.createElement('div');
        div.className = `approval-item type-${item.Tipo}`;
        // Escapa aspas simples para evitar erro no JSON
        div.dataset.full = JSON.stringify(item).replace(/'/g, "&apos;");
        
        div.innerHTML = `
            <div class="app-info">
                <h4>${item.Descricao}</h4>
                <div class="app-meta">
                    <span>${item.Autor}</span>
                    <span>${formatDate(item.Data)}</span>
                </div>
            </div>
            <div class="app-actions">
                <button class="btn-app view" onclick="verDetalhes(this)"><i class="fas fa-eye"></i></button>
                <button class="btn-app approve" onclick="decidir(${item.ID}, '${item.Tipo}', true)"><i class="fas fa-check"></i></button>
                <button class="btn-app reject" onclick="decidir(${item.ID}, '${item.Tipo}', false)"><i class="fas fa-times"></i></button>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderLists(data) {
    const listProd = document.getElementById('list-producao');
    if(listProd) {
        listProd.innerHTML = '';
        if(data.producao.length === 0) listProd.innerHTML = '<li>Nenhuma produção ativa.</li>';
        else data.producao.forEach(p => {
            listProd.innerHTML += `<li><span>Pedido #${p.NumPedido}</span> <span>${p.NomeCliente.split(' ')[0]}</span></li>`;
        });
    }

    const listComex = document.getElementById('list-comex');
    if(listComex) {
        listComex.innerHTML = '';
        if(!data.comex || data.comex.length === 0) listComex.innerHTML = '<li>Nenhum container.</li>';
        else data.comex.forEach(c => {
            listComex.innerHTML += `<li><span>${c.ContainerNumero}</span> <span style="color:#3498db">${c.StatusAtual}</span></li>`;
        });
    }
}

function renderAllCharts(data) {
    createChart('chartVendedores', 'bar', data.comercial.porVendedor.slice(0,5), 'VendedorNome', 'total', 'Faturamento');
    createChart('chartClientes', 'bar', data.comercial.porCliente, 'ClienteNome', 'total', 'Faturamento');
    createChart('chartEstoque', 'doughnut', data.estoque, 'Tipo', 'pesoTotal', 'Peso (kg)');
    createChart('chartManutencao', 'pie', data.manutencao.causas, 'ProblemaDefeito', 'qtd', 'Ocorrências');
    createChart('chartComprasSetor', 'doughnut', data.compras.porSetor, 'Setor', 'qtd', 'Solicitações');
}

function createChart(canvasId, type, dataset, labelKey, valueKey, labelName) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if(charts[canvasId]) charts[canvasId].destroy();
    
    charts[canvasId] = new Chart(ctx, {
        type: type,
        data: {
            labels: dataset.map(d => d[labelKey]),
            datasets: [{
                label: labelName,
                data: dataset.map(d => d[valueKey]),
                backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: type !== 'bar', position: 'right' } },
            scales: type === 'bar' ? { y: { beginAtZero: true } } : {}
        }
    });
}

window.verDetalhes = function(btn) {
    try {
        const data = JSON.parse(btn.closest('.approval-item').dataset.full);
        const content = document.getElementById('modal-detalhes-content');
        if(content) {
            content.innerHTML = `
                <p><strong>Tipo:</strong> ${data.Tipo}</p>
                <p><strong>Título:</strong> ${data.Titulo}</p>
                <p><strong>Autor:</strong> ${data.Autor}</p>
                <p><strong>Data:</strong> ${formatDate(data.Data)}</p>
                <hr style="margin: 10px 0; border:0; border-top:1px solid #eee;">
                <p><strong>Detalhes:</strong><br>${data.Descricao || 'Sem descrição'}</p>
            `;
            document.getElementById('modal-detalhes-solicitacao').classList.add('active');
        }
    } catch(e) { console.error("Erro ao abrir detalhes", e); }
}

window.decidir = async function(id, tipo, aprovado) {
    if(!confirm(`Confirma ${aprovado ? 'APROVAÇÃO' : 'REJEIÇÃO'}?`)) return;
    
    let url = tipo === 'Compra' ? `${API_URL}/solicitacoes-compras/${id}` : `${API_URL}/orcamentos/${id}`;
    let payload = tipo === 'Compra' ? { Status: aprovado ? 'Aprovado' : 'Recusado' } : { status: aprovado ? 'aprovado' : 'rejeitado' };

    try {
        const res = await fetch(url, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        if(res.ok) {
            loadDashboardData();
            if(window.NotificationManager) NotificationManager.show({title:'Sucesso', message:'Atualizado!', type:'success'});
        }
    } catch(e) { alert('Erro ao atualizar'); }
};

// Utils
function formatCurrency(v) { return new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(v); }
function formatNumber(n) { return new Intl.NumberFormat('pt-BR').format(n); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('pt-BR') : '-'; }