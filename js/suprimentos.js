/**
 * suprimentos.js - Gestão de Compras e Logística
 */

document.addEventListener('DOMContentLoaded', () => {
    initializeAppSuprimentos();
});

// Variáveis Globais
let allCompras = [];
let itensTempCompra = [];
let currentEditCompraID = null;

// === DADOS MOCKADOS (Simulação) ===
// Substitua isso pela chamada fetch API quando o backend estiver pronto
const mockCompras = [
    {
        id: 1,
        numero: 'PC-2025-001',
        fornecedor: 'ArcelorMittal',
        dataPedido: '2025-11-01',
        dataEntrega: '2025-11-15',
        status: 'Em Trânsito',
        valorTotal: 15000.00,
        itens: [
            { nome: 'Bobina Aço 0.80', qtd: 2, unidade: 'un', valor: 7500.00, total: 15000.00 }
        ],
        obs: 'Transportadora Braspress - Rastreio: BR123456'
    },
    {
        id: 2,
        numero: 'PC-2025-002',
        fornecedor: 'Perfilados SP',
        dataPedido: '2025-11-10',
        dataEntrega: '2025-11-20',
        status: 'Solicitado',
        valorTotal: 2500.50,
        itens: [],
        obs: ''
    }
];

async function initializeAppSuprimentos() {
    const userId = window.getLoggedInUserID();
    if (!userId) {
        // Redireciona ou avisa se não logado (opcional, já tratado no app.js)
    }

    setupEventListenersSuprimentos();
    
    // Carrega dados (Mock)
    allCompras = [...mockCompras]; 
    
    renderTabelaCompras();
    atualizarKPIs();

    document.getElementById('loader-overlay').style.display = 'none';
}

function setupEventListenersSuprimentos() {
    // Botão Novo
    document.getElementById('btn-nova-compra').addEventListener('click', () => abrirModalCompra('create'));
    
    // Modal
    document.getElementById('close-modal-compra').addEventListener('click', fecharModalCompra);
    document.getElementById('btn-cancelar-compra').addEventListener('click', fecharModalCompra);
    document.getElementById('form-compra').addEventListener('submit', salvarCompra);
    
    // Itens
    document.getElementById('btn-add-item').addEventListener('click', adicionarItemCompra);

    // Filtros
    document.getElementById('filter-search').addEventListener('input', renderTabelaCompras);
    document.getElementById('filter-status').addEventListener('change', renderTabelaCompras);
    document.getElementById('filter-data-entrega').addEventListener('change', renderTabelaCompras);
}

// === MODAL ===

function abrirModalCompra(mode, id = null) {
    const modal = document.getElementById('modal-compra');
    const title = document.getElementById('modal-title-compra');
    const btnSalvar = document.getElementById('btn-salvar-compra');
    
    document.getElementById('form-compra').reset();
    itensTempCompra = [];
    currentEditCompraID = null;
    
    // Data padrão hoje
    document.getElementById('input-data-pedido').valueAsDate = new Date();

    if (mode === 'create') {
        title.textContent = 'Novo Pedido de Compra';
        btnSalvar.textContent = 'Gerar Pedido';
        document.getElementById('input-status').value = 'Solicitado';
    } else {
        title.textContent = 'Editar Pedido / Logística';
        btnSalvar.textContent = 'Salvar Alterações';
        currentEditCompraID = id;
        
        const compra = allCompras.find(c => c.id === id);
        if (compra) preencherFormularioCompra(compra);
    }

    renderTabelaItensCompra();
    atualizarTotalCompra();
    modal.classList.add('active');
}

function fecharModalCompra() {
    document.getElementById('modal-compra').classList.remove('active');
}

function preencherFormularioCompra(data) {
    document.getElementById('input-fornecedor').value = data.fornecedor;
    document.getElementById('input-numero').value = data.numero;
    document.getElementById('input-data-pedido').value = data.dataPedido;
    document.getElementById('input-data-entrega').value = data.dataEntrega || '';
    document.getElementById('input-status').value = data.status;
    document.getElementById('input-obs').value = data.obs;

    // Clona os itens para edição
    itensTempCompra = data.itens.map(i => ({ ...i }));
}

// === ITENS ===

function adicionarItemCompra() {
    const nome = document.getElementById('item-nome').value;
    const qtd = parseFloat(document.getElementById('item-qtd').value);
    const unidade = document.getElementById('item-unidade').value;
    const valor = parseFloat(document.getElementById('item-valor').value);

    if (!nome || !qtd || !valor) {
        showNotification('Preencha nome, quantidade e valor do item.', 'warning');
        return;
    }

    const total = qtd * valor;

    itensTempCompra.push({ nome, qtd, unidade, valor, total });
    
    // Limpa campos de item
    document.getElementById('item-nome').value = '';
    document.getElementById('item-qtd').value = '';
    document.getElementById('item-valor').value = '';
    document.getElementById('item-nome').focus();

    renderTabelaItensCompra();
    atualizarTotalCompra();
}

function removerItemCompra(index) {
    itensTempCompra.splice(index, 1);
    renderTabelaItensCompra();
    atualizarTotalCompra();
}

function renderTabelaItensCompra() {
    const tbody = document.getElementById('tbody-itens-compra');
    tbody.innerHTML = '';

    itensTempCompra.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nome}</td>
            <td class="text-right">${item.qtd} ${item.unidade}</td>
            <td class="text-right">${formatarMoeda(item.valor)}</td>
            <td class="text-right">${formatarMoeda(item.total)}</td>
            <td class="text-center">
                <button type="button" class="action-button delete" onclick="removerItemCompra(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function atualizarTotalCompra() {
    const total = itensTempCompra.reduce((acc, item) => acc + item.total, 0);
    document.getElementById('total-pedido').textContent = formatarMoeda(total);
}

// === CRUD (Simulado por enquanto) ===

function salvarCompra(e) {
    e.preventDefault();
    
    const novaCompra = {
        id: currentEditCompraID || Date.now(),
        fornecedor: document.getElementById('input-fornecedor').value,
        numero: document.getElementById('input-numero').value || 'PC-' + Math.floor(Math.random() * 1000),
        dataPedido: document.getElementById('input-data-pedido').value,
        dataEntrega: document.getElementById('input-data-entrega').value,
        status: document.getElementById('input-status').value,
        obs: document.getElementById('input-obs').value,
        itens: itensTempCompra,
        valorTotal: itensTempCompra.reduce((acc, i) => acc + i.total, 0)
    };

    if (currentEditCompraID) {
        // Edição
        const index = allCompras.findIndex(c => c.id === currentEditCompraID);
        if (index !== -1) allCompras[index] = novaCompra;
    } else {
        // Novo
        allCompras.push(novaCompra);
    }

    showNotification('Pedido de compra salvo com sucesso!', 'success');
    fecharModalCompra();
    renderTabelaCompras();
    atualizarKPIs();
}

// === RENDERIZAÇÃO PRINCIPAL ===

function renderTabelaCompras() {
    const tbody = document.getElementById('compras-tbody');
    const search = document.getElementById('filter-search').value.toLowerCase();
    const statusFilter = document.getElementById('filter-status').value;
    const dataFilter = document.getElementById('filter-data-entrega').value;
    
    const filtrados = allCompras.filter(c => {
        const matchSearch = c.fornecedor.toLowerCase().includes(search) || c.numero.toLowerCase().includes(search);
        const matchStatus = statusFilter === 'todos' || c.status === statusFilter;
        const matchData = !dataFilter || c.dataEntrega === dataFilter;
        
        return matchSearch && matchStatus && matchData;
    });

    tbody.innerHTML = '';
    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum pedido encontrado.</td></tr>';
        return;
    }

    filtrados.forEach(c => {
        const tr = document.createElement('tr');
        const statusClass = c.status.toLowerCase().replace(/ /g, '-').replace('â', 'a');
        
        tr.innerHTML = `
            <td><strong>${c.numero}</strong></td>
            <td>${c.fornecedor}</td>
            <td>${formatarData(c.dataPedido)}</td>
            <td>${formatarData(c.dataEntrega)}</td>
            <td><strong>${formatarMoeda(c.valorTotal)}</strong></td>
            <td><span class="status-badge ${statusClass}">${c.status}</span></td>
            <td class="text-center">
                <div class="table-actions">
                    <button class="action-button edit" onclick="abrirModalCompra('edit', ${c.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function atualizarKPIs() {
    const abertos = allCompras.filter(c => c.status === 'Solicitado' || c.status === 'Aprovado').length;
    const transito = allCompras.filter(c => c.status === 'Em Trânsito').length;
    const recebidos = allCompras.filter(c => c.status === 'Entregue').length; // Lógica simplificada por mês
    const totalValor = allCompras.reduce((acc, c) => acc + c.valorTotal, 0);

    document.getElementById('kpi-abertos').textContent = abertos;
    document.getElementById('kpi-transito').textContent = transito;
    document.getElementById('kpi-recebidos').textContent = recebidos;
    document.getElementById('kpi-valor').textContent = formatarMoeda(totalValor);
}

// === UTILS ===
function formatarMoeda(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function formatarData(d) { if(!d) return '-'; const date = new Date(d + 'T00:00:00'); return date.toLocaleDateString('pt-BR'); }
function showNotification(msg, type) { 
    if (window.NotificationManager) window.NotificationManager.show({ title: type, message: msg, type: type });
    else alert(msg);
}

// Expõe funções para o HTML
window.abrirModalCompra = abrirModalCompra;
window.removerItemCompra = removerItemCompra;