document.addEventListener('DOMContentLoaded', () => {
    initializeAppContas();
});

// === CONSTANTES E VARIÁVEIS GLOBAIS ===
const API_URL = 'https://virtualcriacoes.com/api';
let allContas = []; 
let currentUserID = null;
let currentEditID = null;
let contaParaExcluir = null;

// === INICIALIZAÇÃO ===

async function initializeAppContas() {
    currentUserID = window.getLoggedInUserID(); 
    if (!currentUserID) {
        showNotification('Erro de sessão. Você não está logado.', 'error');
        document.getElementById('btn-novo-lancamento').disabled = true;
        return;
    }
    
    setupEventListenersContas();
    await loadContas();
    renderTabela();

    const loader = document.getElementById('loader-overlay');
    if (loader) loader.style.display = 'none';
}

async function loadContas() {
    try {
        const response = await fetch(`${API_URL}/contasapagar`);
        if (!response.ok) throw new Error('Falha ao carregar contas a pagar');
        allContas = await response.json();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// === CONFIGURAÇÃO DE EVENTOS ===

function setupEventListenersContas() {
    document.getElementById('btn-novo-lancamento').addEventListener('click', () => abrirModal('create'));
    document.getElementById('close-modal').addEventListener('click', fecharModal);
    document.getElementById('btn-cancelar').addEventListener('click', fecharModal);
    document.getElementById('form-conta').addEventListener('submit', salvarConta);
    
    document.getElementById('search-input-main').addEventListener('input', renderTabela);
    document.getElementById('filter-status').addEventListener('change', renderTabela);
    document.getElementById('filter-categoria').addEventListener('change', renderTabela);
    
    // Conecta a busca da top-bar
    document.getElementById('search-input').addEventListener('input', (e) => {
        document.getElementById('search-input-main').value = e.target.value;
        renderTabela();
    });
}

// === LÓGICA DOS MODAIS ===

function abrirModal(mode, contaID = null) {
    currentEditID = null;
    document.getElementById('form-conta').reset();
    
    const modalTitle = document.getElementById('modal-title');
    const btnSalvar = document.getElementById('btn-salvar');
    const editSection = document.getElementById('edit-section');

    if (mode === 'create') {
        modalTitle.textContent = 'Lançar Despesa';
        btnSalvar.textContent = 'Salvar Despesa';
        editSection.style.display = 'none'; // Esconde seção de edição
    } else {
        modalTitle.textContent = 'Editar Lançamento';
        btnSalvar.textContent = 'Salvar Alterações';
        editSection.style.display = 'block'; // Mostra seção de edição
        currentEditID = contaID;
        
        const conta = allContas.find(c => c.ID === contaID);
        if (conta) {
            preencherFormulario(conta);
        }
    }
    
    document.getElementById('modal-conta').classList.add('active');
}

function fecharModal() {
    document.getElementById('modal-conta').classList.remove('active');
}

function preencherFormulario(data) {
    document.getElementById('conta-id').value = data.ID;
    document.getElementById('input-descricao').value = data.Descricao;
    document.getElementById('input-fornecedor').value = data.Fornecedor;
    document.getElementById('input-categoria').value = data.Categoria;
    document.getElementById('input-valor').value = parseFloat(data.Valor).toFixed(2);
    document.getElementById('input-vencimento').value = data.DataVencimento;
    document.getElementById('input-observacoes').value = data.Observacoes;
    
    // NOVOS CAMPOS
    document.getElementById('input-tipo-pgto').value = data.TipoPagamento || 'À Vista';
    document.getElementById('input-forma-pgto').value = data.FormaPagamento || 'Pix';
    
    document.getElementById('input-status').value = data.Status;
    document.getElementById('input-pagamento').value = data.DataPagamento;
}

// === RENDERIZAÇÃO DA TABELA ===

function renderTabela() {
    const tbody = document.getElementById('contasapagar-tbody');
    const filtroStatus = document.getElementById('filter-status').value;
    const filtroCategoria = document.getElementById('filter-categoria').value;
    const filtroSearch = document.getElementById('search-input-main').value.toLowerCase();
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const filtradas = allContas.filter(c => {
        const matchCategoria = (filtroCategoria === 'todas') || (c.Categoria === filtroCategoria);
        
        const matchSearch = (c.Descricao.toLowerCase().includes(filtroSearch) ||
                             (c.Fornecedor && c.Fornecedor.toLowerCase().includes(filtroSearch)));
                             
        // Lógica de Status (incluindo Vencido)
        const dataVencimento = new Date(c.DataVencimento + 'T00:00:00');
        let statusReal = c.Status;
        if (statusReal === 'Pendente' && dataVencimento < hoje) {
            statusReal = 'Vencido';
        }
        
        const matchStatus = (filtroStatus === 'todos') || (statusReal === filtroStatus);

        return matchCategoria && matchSearch && matchStatus;
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
        if (statusReal === 'Pendente' && dataVencimento < hoje) {
            statusReal = 'Vencido';
        }
        
        const statusClass = statusReal.toLowerCase().replace(/ /g, '-');
        
        let acoesHTML = `
            <button class="action-button edit" onclick="abrirModal('edit', ${c.ID})" title="Editar">
                <i class="fas fa-edit"></i>
            </button>
        `;
        
        if (c.Status === 'Pendente') {
            acoesHTML += `
                <button class="action-button pay" onclick="marcarComoPago(${c.ID})" title="Marcar como Pago">
                    <i class="fas fa-check"></i>
                </button>
                <button class="action-button delete" onclick="confirmarExclusao(${c.ID}, '${c.Descricao}')" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        }
        
        if (c.Status === 'Pago') {
             acoesHTML += `
                <button class="action-button undo" onclick="marcarComoPendente(${c.ID})" title="Estornar (Marcar como Pendente)">
                    <i class="fas fa-undo"></i>
                </button>
            `;
        }

        tr.innerHTML = `
            <td>${c.Descricao}</td>
            <td>${c.Fornecedor || 'N/A'}</td>
            <td>${c.Categoria}</td>
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

// === LÓGICA DE SALVAMENTO (API) ===

async function salvarConta(event) {
    event.preventDefault();
    const btnSalvar = document.getElementById('btn-salvar');
    btnSalvar.disabled = true;
    btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    const payload = {
        ID: currentEditID ? parseInt(currentEditID) : null,
        UsuarioID: currentUserID,
        Descricao: document.getElementById('input-descricao').value,
        Fornecedor: document.getElementById('input-fornecedor').value,
        Categoria: document.getElementById('input-categoria').value,
        Valor: parseFloat(document.getElementById('input-valor').value),
        DataVencimento: document.getElementById('input-vencimento').value,
        Observacoes: document.getElementById('input-observacoes').value,
        
        // NOVOS CAMPOS
        TipoPagamento: document.getElementById('input-tipo-pgto').value,
        FormaPagamento: document.getElementById('input-forma-pgto').value,
        
        Status: document.getElementById('input-status').value,
        DataPagamento: document.getElementById('input-pagamento').value || null
    };

    let url = `${API_URL}/contasapagar`;
    let method = 'POST';

    if (currentEditID) {
        url = `${API_URL}/contasapagar/${currentEditID}`;
        method = 'PUT';
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Falha ao salvar');
        }

        const result = await response.json();
        showNotification(result.message, 'success');
        fecharModal();
        await loadContas();
        renderTabela();

    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent = currentEditID ? 'Salvar Alterações' : 'Salvar Despesa';
    }
}

async function marcarComoPago(id) {
    try {
        const response = await fetch(`${API_URL}/contasapagar/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ marcarComoPago: true })
        });
        if (!response.ok) throw new Error('Falha ao atualizar status');
        
        showNotification('Conta marcada como paga!', 'success');
        await loadContas();
        renderTabela();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function marcarComoPendente(id) {
    try {
        const response = await fetch(`${API_URL}/contasapagar/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ marcarComoPendente: true })
        });
        if (!response.ok) throw new Error('Falha ao estornar pagamento');
        
        showNotification('Pagamento estornado. Conta marcada como pendente.', 'info');
        await loadContas();
        renderTabela();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function confirmarExclusao(id, nome) {
    contaParaExcluir = { id: id, nome: nome };
    
    // Reutiliza o modal de exclusão de orçamentos
    const modal = document.getElementById('modal-confirmar-exclusao');
    if (!modal) {
        showNotification('Erro: Modal de exclusão não encontrado.', 'error');
        return;
    }
    
    document.getElementById('exclusao-modal-title').textContent = 'Confirmar Exclusão';
    document.getElementById('exclusao-mensagem').textContent = 'Tem certeza que deseja excluir este lançamento?';
    document.getElementById('exclusao-orcamento-numero').textContent = nome;
    
    const btnConfirmar = document.getElementById('btn-confirmar-exclusao');
    btnConfirmar.onclick = executarExclusaoConta; // Define o clique para a função correta

    modal.classList.add('active');
}

async function executarExclusaoConta() {
    if (!contaParaExcluir) return;
    
    const { id, nome } = contaParaExcluir;
    const btnConfirmar = document.getElementById('btn-confirmar-exclusao');
    btnConfirmar.disabled = true;
    btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';
    
    try {
        const response = await fetch(`${API_URL}/contasapagar/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Falha ao excluir');
        }

        showNotification(`Lançamento "${nome}" excluído com sucesso!`, 'success');
        
        document.getElementById('modal-confirmar-exclusao').classList.remove('active');
        await loadContas(); 
        renderTabela();

    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = 'Sim, Excluir';
        contaParaExcluir = null;
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