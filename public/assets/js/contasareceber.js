document.addEventListener('DOMContentLoaded', () => {
    initializeAppContasReceber();
});

// === CONSTANTES E VARIÁVEIS GLOBAIS ===
const API_URL = 'https://virtualcriacoes.com/api';
let allContas = []; 
let currentUserID = null;

// === INICIALIZAÇÃO ===

async function initializeAppContasReceber() {
    currentUserID = window.getLoggedInUserID(); 
    if (!currentUserID) {
        showNotification('Erro de sessão. Você não está logado.', 'error');
        return;
    }
    
    setupEventListenersContasReceber();
    await loadContasReceber();
    renderTabela();
    atualizarEstatisticas();

    const loader = document.getElementById('loader-overlay');
    if (loader) loader.style.display = 'none';
}

async function loadContasReceber() {
    try {
        const response = await fetch(`${API_URL}/contasareceber`);
        if (!response.ok) throw new Error('Falha ao carregar contas a receber');
        allContas = await response.json();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// === CONFIGURAÇÃO DE EVENTOS ===

function setupEventListenersContasReceber() {
    document.getElementById('search-input-main').addEventListener('input', renderTabela);
    document.getElementById('filter-status').addEventListener('change', renderTabela);
    // Adicione:
    document.getElementById('close-modal-receber').addEventListener('click', fecharModalReceber);
    document.getElementById('btn-cancelar-receber').addEventListener('click', fecharModalReceber);
    document.getElementById('form-conta-receber').addEventListener('submit', salvarContaReceber);
    
    // Conecta a busca da top-bar
    document.getElementById('search-input').addEventListener('input', (e) => {
        document.getElementById('search-input-main').value = e.target.value;
        renderTabela();
    });
}

// === RENDERIZAÇÃO DA TABELA ===

function renderTabela() {
    const tbody = document.getElementById('contasareceber-tbody');
    const filtroStatus = document.getElementById('filter-status').value;
    const filtroSearch = document.getElementById('search-input-main').value.toLowerCase();
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const filtradas = allContas.filter(c => {
        const matchSearch = (c.ClienteNome.toLowerCase().includes(filtroSearch) ||
                             (c.NumeroPedido && c.NumeroPedido.toLowerCase().includes(filtroSearch)));
                             
        // Lógica de Status (incluindo Vencido)
        const dataVencimento = new Date(c.DataVencimento + 'T00:00:00');
        let statusReal = c.Status;
        if (statusReal === 'Aguardando' && dataVencimento < hoje) {
            statusReal = 'Vencido';
        }
        
        const matchStatus = (filtroStatus === 'todos') || (statusReal === filtroStatus);

        return matchSearch && matchStatus;
    });

    tbody.innerHTML = '';
    if (filtradas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum lançamento encontrado.</td></tr>';
        return;
    }

    filtradas.forEach(c => {
        const tr = document.createElement('tr');
        
        const dataVencimento = new Date(c.DataVencimento + 'T00:00:00');
        let statusReal = c.Status;
        if (statusReal === 'Aguardando' && dataVencimento < hoje) {
            statusReal = 'Vencido';
        }
        
        const statusClass = statusReal.toLowerCase().replace(/ /g, '-');
        
        let acoesHTML = '';
        
        if (c.Status === 'Aguardando' || statusReal === 'Vencido') {
            acoesHTML = `
                <button class="action-button pay" onclick="marcarComoRecebido(${c.ID})" title="Marcar como Recebido">
                    <i class="fas fa-check"></i>
                </button>
                <button class="action-button edit" onclick="abrirModalEditarReceber(${c.ID})" title="Editar Detalhes">
                    <i class="fas fa-edit"></i>
                </button>
        `;
        }
        
        if (c.Status === 'Pago') {
             acoesHTML = `
                <button class="action-button undo" onclick="marcarComoAguardando(${c.ID})" title="Estornar (Marcar como Aguardando)">
                    <i class="fas fa-undo"></i>
                </button>
            `;
        }

        tr.innerHTML = `
            <td>${c.ClienteNome}</td>
            <td>${c.NumeroPedido || 'N/A'}</td>
            <td>${formatarData(c.DataEmissao)}</td>
            <td>${formatarData(c.DataVencimento)}</td>
            <td><strong>${formatarMoeda(c.Valor)}</strong></td>
            <td><span class="status-badge ${statusClass}">${statusReal}</span></td>
            <td class="text-center">
                <div class="table-actions">
                    ${acoesHTML}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function atualizarEstatisticas() {
    let totalAReceber = 0;
    let totalVencido = 0;
    let totalRecebido30d = 0;
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const data30d = new Date();
    data30d.setDate(data30d.getDate() - 30);
    data30d.setHours(0, 0, 0, 0);

    allContas.forEach(c => {
        const valor = parseFloat(c.Valor);
        
        if (c.Status === 'Aguardando') {
            totalAReceber += valor;
            const dataVencimento = new Date(c.DataVencimento + 'T00:00:00');
            if (dataVencimento < hoje) {
                totalVencido += valor;
            }
        }
        
        if (c.Status === 'Pago' && c.DataRecebimento) {
            const dataRecebimento = new Date(c.DataRecebimento + 'T00:00:00');
            if (dataRecebimento >= data30d) {
                totalRecebido30d += valor;
            }
        }
    });

    document.getElementById('stat-a-receber').textContent = formatarMoeda(totalAReceber);
    document.getElementById('stat-vencido').textContent = formatarMoeda(totalVencido);
    document.getElementById('stat-recebido').textContent = formatarMoeda(totalRecebido30d);
}

// === LÓGICA DA API (Marcar Pago / Estornar) ===

async function marcarComoRecebido(id) {
    try {
        const response = await fetch(`${API_URL}/contasareceber/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ marcarComoRecebido: true })
        });
        if (!response.ok) throw new Error('Falha ao atualizar status');
        
        showNotification('Conta marcada como recebida!', 'success');
        await loadContasReceber();
        renderTabela();
        atualizarEstatisticas();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function marcarComoAguardando(id) {
    try {
        const response = await fetch(`${API_URL}/contasareceber/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ marcarComoAguardando: true })
        });
        if (!response.ok) throw new Error('Falha ao estornar pagamento');
        
        showNotification('Recebimento estornado. Conta marcada como aguardando.', 'info');
        await loadContasReceber();
        renderTabela();
        atualizarEstatisticas();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// === FUNÇÕES UTILITÁRIAS ===

function formatarMoeda(valor) {
    if (typeof valor !== 'number') {
        valor = parseFloat(valor) || 0;
    }
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

function formatarData(dataString) {
    if (!dataString) return 'N/A';
    const data = new Date(dataString + 'T00:00:00'); 
    return data.toLocaleDateString('pt-BR');
}

function showNotification(message, type = 'info') {
    if (window.NotificationManager) {
        const title = type.charAt(0).toUpperCase() + type.slice(1);
        window.NotificationManager.show({ title: title, message: message, type: type });
    } else {
        alert(message);
    }
}

function abrirModalEditarReceber(id) {
    const conta = allContas.find(c => c.ID === id);
    if (!conta) return;

    document.getElementById('receber-id').value = conta.ID;
    document.getElementById('receber-cliente').value = conta.ClienteNome;
    document.getElementById('receber-pedido').value = conta.NumeroPedido || '';
    document.getElementById('receber-valor').value = parseFloat(conta.Valor).toFixed(2);
    document.getElementById('receber-vencimento').value = conta.DataVencimento;
    
    // Preenche novos campos
    document.getElementById('receber-tipo-pgto').value = conta.TipoPagamento || 'À Vista';
    document.getElementById('receber-forma-pgto').value = conta.FormaPagamento || 'Boleto';
    
    document.getElementById('receber-status').value = conta.Status;
    document.getElementById('receber-data-recebimento').value = conta.DataRecebimento || '';

    document.getElementById('modal-conta-receber').classList.add('active');
}

function fecharModalReceber() {
    document.getElementById('modal-conta-receber').classList.remove('active');
}

async function salvarContaReceber(e) {
    e.preventDefault();
    const id = document.getElementById('receber-id').value;
    
    const payload = {
        ClienteNome: document.getElementById('receber-cliente').value,
        NumeroPedido: document.getElementById('receber-pedido').value,
        Valor: parseFloat(document.getElementById('receber-valor').value),
        DataVencimento: document.getElementById('receber-vencimento').value,
        
        TipoPagamento: document.getElementById('receber-tipo-pgto').value,
        FormaPagamento: document.getElementById('receber-forma-pgto').value,
        
        Status: document.getElementById('receber-status').value,
        DataRecebimento: document.getElementById('receber-data-recebimento').value
    };

    try {
        const res = await fetch(`${API_URL}/contasareceber/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        if(res.ok) {
            showNotification('Atualizado com sucesso!', 'success');
            fecharModalReceber();
            loadContasReceber();
            renderTabela();
            atualizarEstatisticas();
        } else {
            showNotification('Erro ao atualizar.', 'error');
        }
    } catch (e) {
        showNotification(e.message, 'error');
    }
}

// Expõe globalmente
window.abrirModalEditarReceber = abrirModalEditarReceber;