/**
 * estoque.js - Funcionalidades para a página de estoque
 * VERSÃO FINALIZADA E INTEGRADA COM BACKEND E REGRAS DE NEGÓCIO
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 ESTOQUE: Script carregado');
    
    initPage();
    setupEventListeners();
    loadData(); // Agora carrega da API
});

let bobinaDatabase = []; // Será preenchida diretamente da API

// Configurações de paginação
let currentPage = 1;
const itemsPerPage = 10;
let filteredData = [];

// Elemento sendo editado
let currentEditId = null;

// Configuração de ordenação
let currentSortOrder = 'desc';

/**
 * Salva movimentação no sistema de movimentações via API
 */
async function salvarMovimentacao(tipoOperacao, dadosBobina, tipoMovimentacaoDescritivo, observacaoExtra = '') {
    console.log('💾 ESTOQUE: Salvando movimentação via API:', tipoOperacao, dadosBobina);
    
    // CORREÇÃO: Chamar a função utilitária getLoggedInUser() aqui
    const loggedInUser = window.getLoggedInUser();

    const newMov = {
        timestamp: new Date().toISOString(),
        tipo: tipoOperacao,
        descricao: dadosBobina.Tipo || dadosBobina.tipo,
        lote: dadosBobina.Lote || dadosBobina.lote,
        pesoKg: Number(dadosBobina.Peso || dadosBobina.peso),
        origemDestino: dadosBobina.Fornecedor || dadosBobina.fornecedor,
        observacao: observacaoExtra || dadosBobina.Observacao || dadosBobina.observacao,
        naturezaOperacao: dadosBobina.NaturezaOperacao || dadosBobina.naturezaOperacao,
        tipoMovimentacao: tipoMovimentacaoDescritivo,
        usuario: loggedInUser // Novo campo adicionado
    };

    try {
        const response = await fetch('https://virtualcriacoes.com/api/movimentacoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newMov)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha ao registrar movimentação.');
        }
        console.log('✅ ESTOQUE: Movimentação salva via API com sucesso');
    } catch (error) {
        console.error('❌ ESTOQUE: Erro ao salvar movimentação via API:', error);
        if(window.NotificationManager) NotificationManager.show({ title: 'Erro', message: `Falha ao registrar movimentação: ${error.message}`, type: 'error' });
    }
}

/**
 * Inicializa os elementos da página
 */
function initPage() {
    document.getElementById('data-recebimento').valueAsDate = new Date();
    initModals();
}

/**
 * Configuração dos listeners de eventos
 */
function setupEventListeners() {
    document.getElementById('btn-nova-bobina').addEventListener('click', function() {
        openModal('Nova Bobina');
    });
    
    document.getElementById('form-bobina').addEventListener('submit', handleFormSubmit);
    document.getElementById('btn-exportar-estoque').addEventListener('click', exportTableToCSV);
    
    document.getElementById('filter-tipo').addEventListener('change', applyFilters);
    document.getElementById('filter-espessura').addEventListener('change', applyFilters);
    document.getElementById('filter-largura').addEventListener('change', applyFilters); // NOVO FILTRO
    document.getElementById('filter-mes').addEventListener('change', applyFilters);
    document.getElementById('filter-natureza-operacao').addEventListener('change', applyFilters);
    document.getElementById('filter-tipo-movimentacao').addEventListener('change', applyFilters);
    
    document.getElementById('search-bobina').addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            applyFilters();
        }
    });
    
    document.getElementById('prev-page').addEventListener('click', function() {
        changePage(-1);
    });
    
    document.getElementById('next-page').addEventListener('click', function() {
        changePage(1);
    });
    
    document.getElementById('btn-sort-date').addEventListener('click', function() {
        toggleSortOrder();
    });
    
    document.getElementById('btn-confirma-exclusao').addEventListener('click', confirmDelete);
    
    document.getElementById('btn-editar-detalhe').addEventListener('click', function() {
        if (currentEditId) {
            editBobina(currentEditId);
        }
        // ===== CORREÇÃO: USAR closeAllModals() =====
        closeAllModals();
        // REMOVIDO: document.getElementById('modal-detalhes').style.display = 'none';
    });
    
    document.getElementById('btn-excluir-detalhe').addEventListener('click', function() {
        if (currentEditId) {
            const bobina = bobinaDatabase.find(item => item.ID === currentEditId);
            if (bobina) {
                openDeleteConfirmation(currentEditId, bobina.Lote);
            }
        }
        // ===== CORREÇÃO: USAR closeAllModals() =====
        closeAllModals();
        // REMOVIDO: document.getElementById('modal-detalhes').style.display = 'none';
    });
}

/**
 * Alterna a ordem de classificação por data (mantém o ID, que reflete a ordem de criação)
 */
function toggleSortOrder() {
    currentSortOrder = currentSortOrder === 'desc' ? 'asc' : 'desc';
    
    const sortButton = document.getElementById('btn-sort-date');
    if (currentSortOrder === 'desc') {
        sortButton.innerHTML = '<i class="fas fa-calendar-alt"></i> Mais Recentes';
        sortButton.title = 'Ordenar por Data (Mais recentes primeiro)';
    } else {
        sortButton.innerHTML = '<i class="fas fa-calendar-alt"></i> Mais Antigos';
        sortButton.title = 'Ordenar por Data (Mais antigos primeiro)';
    }
    
    applyFilters(); // Reaplicar filtros com a nova ordenação
}

/**
 * Ordena os dados por data de cadastro (ID) ou data de recebimento
 */
function sortDataByDate(data) {
    return data.sort(function(a, b) {
        // Ordena pelo ID, que geralmente reflete a ordem de criação
        if (currentSortOrder === 'desc') {
            return b.ID - a.ID; // Mais recentes primeiro (ID maior)
        } else {
            return a.ID - b.ID; // Mais antigos primeiro (ID menor)
        }
    });
}

/**
 * Carrega e exibe os dados (AGORA DO BACKEND)
 */
// Localize a função loadData em seu estoque.js
async function loadData() {
    try {
        console.log("loadData() iniciado. Buscando bobinas da API...");
        const response = await fetch('https://virtualcriacoes.com/api/bobinas');
        if (!response.ok) {
            throw new Error('Falha ao carregar bobinas do servidor.');
        }
        
        // CORREÇÃO CRUCIAL AQUI
        let dataFromApi = await response.json();
        bobinaDatabase = dataFromApi.map(item => ({
            ...item,
            ID: parseInt(item.ID), // Garante que a propriedade ID seja um número
            Peso: parseFloat(item.Peso) // Boa prática: garante que o Peso também seja um número
        }));
        
        console.log("Dados de bobinas carregados da API:", bobinaDatabase.length, bobinaDatabase);
        
        applyFilters();
        updateSummary();
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        if(window.NotificationManager) NotificationManager.show({ title: 'Erro', message: `Falha ao carregar estoque: ${error.message}`, type: 'error' });
    }
}

/**
 * Aplica filtros aos dados e atualiza a tabela
 */
function applyFilters() {
    const tipoFilter = document.getElementById('filter-tipo').value;
    const espessuraFilter = document.getElementById('filter-espessura').value;
    const larguraFilter = document.getElementById('filter-largura').value; // NOVO FILTRO
    const searchTerm = document.getElementById('search-bobina').value.toLowerCase();
    const mesFilter = document.getElementById('filter-mes').value;
    const naturezaOperacaoFilter = document.getElementById('filter-natureza-operacao').value;
    const tipoMovimentacaoFilter = document.getElementById('filter-tipo-movimentacao').value;
    
    filteredData = bobinaDatabase.filter(function(bobina) {
        // Use os nomes de campo capitalizados do backend
        if (tipoFilter && bobina.Tipo !== tipoFilter) {
            return false;
        }
        
        if (espessuraFilter && parseFloat(bobina.Espessura).toFixed(2) !== parseFloat(espessuraFilter).toFixed(2)) {
            return false;
        }

        if (larguraFilter && parseFloat(bobina.Largura).toFixed(2) !== parseFloat(larguraFilter).toFixed(2)) { // Lógica para o novo filtro de largura
            return false;
        }
        
        if (mesFilter) {
            const dataRecebimento = new Date(bobina.DataRecebimento); // Convertendo para Date object
            const mesBobina = (dataRecebimento.getMonth() + 1).toString().padStart(2, '0'); // Mês com 2 dígitos
            if (mesBobina !== mesFilter) {
                return false;
            }
        }

        if (naturezaOperacaoFilter && bobina.NaturezaOperacao !== naturezaOperacaoFilter) {
            return false;
        }

        if (tipoMovimentacaoFilter && bobina.TipoMovimentacao !== tipoMovimentacaoFilter) {
            return false;
        }
        
        if (searchTerm) {
            // Use os nomes de campo capitalizados do backend
            return bobina.Lote.toLowerCase().includes(searchTerm) || 
                   bobina.Fornecedor.toLowerCase().includes(searchTerm);
        }
        
        return true;
    });
    
    filteredData = sortDataByDate(filteredData);
    
    currentPage = 1;
    
    renderTable(); // Agora renderTable é chamada explicitamente aqui
    updatePagination();
}

/**
 * Renderiza a tabela com os dados filtrados
 */
function renderTable() {
    const tableBody = document.querySelector('#tabela-bobinas tbody');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    console.log("renderTable() iniciado. Dados paginados:", paginatedData);

    tableBody.innerHTML = '';
    if (paginatedData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="12" class="empty-state"><i class="fas fa-box-open"></i><p>Nenhuma bobina encontrada.</p></td></tr>`;
        return;
    }

    paginatedData.forEach(bobina => {
        // Use os nomes de campo capitalizados do backend
        const pesoBobina = Number(bobina.Peso);
        const statusHtml = bobina.Status === 'Indisponível' 
            ? `<span class="status-badge status-indisponivel">Indisponível</span>` 
            : `<span class="status-badge status-disponivel">Disponível</span>`;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-id="${bobina.ID}" class="view-details-cell">${bobina.DataRecebimento.split('-').reverse().join('/')}</td>
            <td data-id="${bobina.ID}" class="view-details-cell">${bobina.Fornecedor}</td>
            <td data-id="${bobina.ID}" class="view-details-cell">${bobina.NotaFiscal}</td>
            <td data-id="${bobina.ID}" class="view-details-cell">${bobina.Tipo}</td>
            <td data-id="${bobina.ID}" class="view-details-cell">${bobina.Lote}</td>
            <td data-id="${bobina.ID}" class="view-details-cell">${bobina.Espessura} mm</td>
            <td data-id="${bobina.ID}" class="view-details-cell">${bobina.Largura} mm</td>
            <td data-id="${bobina.ID}" class="view-details-cell">${pesoBobina.toFixed(2)}</td>
            <td data-id="${bobina.ID}" class="view-details-cell">${bobina.NaturezaOperacao || 'N/A'}</td>
            <td data-id="${bobina.ID}" class="view-details-cell">${bobina.TipoMovimentacao || 'N/A'}</td>
            <td>${statusHtml}</td>
            <td class="table-actions">
                <button class="action-button view" data-id="${bobina.ID}" title="Ver Detalhes">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-button edit" data-id="${bobina.ID}" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-button delete" data-id="${bobina.ID}" data-lote="${bobina.Lote}" title="Excluir">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
        console.log("Renderizando bobina:", bobina.Lote); // Para cada bobina
    });

    addTableEventListeners(); // Certifique-se de que os listeners são adicionados APÓS o HTML ser inserido
}

/**
 * Adiciona event listeners aos elementos da tabela (APÓS renderização)
 */
/**
 * Adiciona event listeners aos elementos da tabela (APÓS renderização).
 * Esta é uma versão de teste para depurar a captura dos eventos.
 */
/**
 * Adiciona event listeners aos elementos da tabela (APÓS renderização)
 */
function addTableEventListeners() {
    // Listener para o botão de visualização
    document.querySelectorAll('#tabela-bobinas .action-button.view').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            viewDetails(parseInt(this.dataset.id));
        });
    });

    // Listener para o botão de edição
    document.querySelectorAll('#tabela-bobinas .action-button.edit').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            editBobina(parseInt(this.dataset.id));
        });
    });
    
    // Listener para o botão de exclusão
    document.querySelectorAll('#tabela-bobinas .action-button.delete').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            openDeleteConfirmation(parseInt(this.dataset.id), this.dataset.lote);
        });
    });

    // Listener para as células de detalhes
    document.querySelectorAll('#tabela-bobinas .view-details-cell').forEach(cell => {
        cell.addEventListener('click', function() {
            viewDetails(parseInt(this.dataset.id));
        });
    });
}

/**
 * Atualiza os controles de paginação
 */
function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    
    document.getElementById('total-pages').textContent = totalPages;
    document.querySelector('.current-page').textContent = currentPage;
    
    document.getElementById('prev-page').disabled = currentPage <= 1;
    document.getElementById('next-page').disabled = currentPage >= totalPages;
}

/**
 * Muda para a página anterior ou próxima
 */
function changePage(direction) {
    const newPage = currentPage + direction;
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    
    if (newPage > 0 && newPage <= totalPages) {
        currentPage = newPage;
        renderTable();
        updatePagination();
    }
}

/**
 * Atualiza o resumo do estoque
 */
function updateSummary() {
    const pesoTotal = bobinaDatabase.reduce(function(total, bobina) {
        return total + Number(bobina.Peso); // Use Peso capitalizado
    }, 0);
    
    const totalBobinas = bobinaDatabase.filter(bobina => Number(bobina.Peso) > 0).length; // Use Peso capitalizado
    
    document.getElementById('peso-total').textContent = `${pesoTotal.toFixed(2)} kg`;
    document.getElementById('total-bobinas').textContent = totalBobinas;
}

/**
 * Inicializa os modais
 */
function initModals() {
    // Botões para fechar modais
    document.querySelectorAll('.close-modal, .cancel-modal').forEach(function(button) {
        button.addEventListener('click', closeAllModals); // LINHA 349: click e closeAllModals
    });
    
    // Fechar modais ao clicar fora deles
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
}

/**
 * Abre o modal de bobina (criar ou editar)
 */
function openModal(title) {
    if (title === 'Nova Bobina') {
        document.getElementById('form-bobina').reset();
        document.getElementById('bobina-id').value = '';
        currentEditId = null;
        document.getElementById('data-recebimento').valueAsDate = new Date();
    }
    
    // Definir título
    document.getElementById('modal-title').textContent = title;
    
    const modalElement = document.getElementById('modal-bobina');
    if (modalElement) {
        modalElement.classList.add('is-active');
        // REMOVIDO: modalElement.style.display = 'block'; // NÃO usar style inline
    }
}

/**
 * Abre o modal para editar uma bobina
 */
// ...
function editBobina(id) {
    console.log('Iniciando função editBobina. ID recebido:', id);
    
    const bobinaId = parseInt(id);
    if (isNaN(bobinaId)) {
        console.error('ID inválido:', id);
        showMessage('ID da bobina inválido para edição!', 'error');
        return;
    }

    const bobina = bobinaDatabase.find(item => item.ID === bobinaId);
    if (!bobina) {
        showMessage('Bobina não encontrada para edição!', 'error');
        console.log('Erro: Bobina com ID', bobinaId, 'não encontrada no banco de dados local.');
        return;
    }
    
    if (!bobina) {
        showMessage('Bobina não encontrada para edição!', 'error');
        console.log('Erro: Bobina com ID', bobinaId, 'não encontrada no banco de dados local.');
        return;
    }

    console.log('Bobina encontrada para edição:', bobina);

    document.getElementById('bobina-id').value = id;
    document.getElementById('tipo-material').value = bobina.Tipo;
    document.getElementById('espessura-chapa').value = parseFloat(bobina.Espessura).toFixed(2);
    
    let larguraValue = String(bobina.Largura);
    if (larguraValue.endsWith('.0')) {
        larguraValue = larguraValue.slice(0, -2);
    }
    document.getElementById('largura-chapa').value = larguraValue;
    
    document.getElementById('fornecedor').value = bobina.Fornecedor;
    document.getElementById('nota-fiscal').value = bobina.NotaFiscal;
    
    let dataRecebimentoObj = new Date(bobina.DataRecebimento);
    const formattedDate = dataRecebimentoObj.toISOString().split('T')[0];
    document.getElementById('data-recebimento').value = formattedDate;
    
    document.getElementById('lote').value = bobina.Lote;
    document.getElementById('peso-bobina').value = bobina.Peso;

    document.getElementById('natureza-operacao').value = bobina.NaturezaOperacao || '';
    document.getElementById('tipo-movimentacao').value = bobina.TipoMovimentacao || '';
    document.getElementById('observacao').value = bobina.Observacao || '';
    
    currentEditId = id;
    openModal('Editar Bobina');
}

// ...
/**
 * Abre o modal de confirmação de exclusão
 */
function openDeleteConfirmation(id, lote) {
    currentEditId = id;
    document.getElementById('lote-exclusao').textContent = lote;
    
    // ===== CORREÇÃO: USAR CLASSE is-active =====
    const modal = document.getElementById('modal-confirma-exclusao');
    modal.classList.add('is-active');
    // REMOVIDO: modal.style.display = 'block';
}

/**
 * Abre o modal de detalhes da bobina
 */
function viewDetails(id) {
    console.log('Iniciando função viewDetails. ID recebido:', id);
    
    const bobinaId = parseInt(id);
    if (isNaN(bobinaId)) {
        console.error('ID inválido:', id);
        showMessage('ID da bobina inválido para visualização!', 'error');
        return;
    }

    const bobina = bobinaDatabase.find(b => b.ID === bobinaId);
    if (!bobina) {
        showMessage('Bobina não encontrada para visualização!', 'error');
        console.log('Erro: Bobina com ID', bobinaId, 'não encontrada no banco de dados local.');
        return;
    }

    console.log('Bobina encontrada para visualização:', bobina);

    currentEditId = id;

    document.getElementById('detalhe-lote').textContent = bobina.Lote;
    document.getElementById('detalhe-tipo').textContent = bobina.Tipo;
    document.getElementById('detalhe-espessura').textContent = `${bobina.Espessura} mm`;
    document.getElementById('detalhe-largura').textContent = `${bobina.Largura} mm`;
    document.getElementById('detalhe-peso').textContent = `${Number(bobina.Peso).toFixed(2)} kg`;

    document.getElementById('detalhe-fornecedor').textContent = bobina.Fornecedor;
    document.getElementById('detalhe-nota-fiscal').textContent = bobina.NotaFiscal;

    document.getElementById('detalhe-natureza').textContent = bobina.NaturezaOperacao || 'N/A';
    document.getElementById('detalhe-tipo-movimentacao').textContent = bobina.TipoMovimentacao || 'N/A';
    document.getElementById('detalhe-observacao').textContent = bobina.Observacao || 'N/A';

    const statusBadge = document.getElementById('detalhe-status');
    if (bobina.Status === 'Indisponível') {
        statusBadge.textContent = 'Indisponível';
        statusBadge.className = 'status-badge status-indisponivel';
    } else {
        statusBadge.textContent = 'Disponível';
        statusBadge.className = 'status-badge status-disponivel';
    }
    
    const modal = document.getElementById('modal-detalhes');
    modal.classList.add('is-active');
}

/**
 * Fecha todos os modais
 */
function closeAllModals() {
    console.log("DEBUG: closeAllModals() chamado.");    
    const modals = document.querySelectorAll('.modal');
    console.log("DEBUG: Modais encontrados:", modals.length, modals);
    modals.forEach(function(modal) {
        // ===== CORREÇÃO: USAR APENAS CLASSES, NÃO STYLE INLINE =====
        modal.classList.remove('is-active');
        // REMOVIDO: modal.style.display = 'none'; // NÃO usar style inline
        
        // ADICIONAL: Limpar qualquer style inline que possa existir
        modal.style.removeProperty('display');
        
        console.log(`DEBUG: Modal ${modal.id} classe is-active removida`);
    });
}
async function handleFormSubmit(event) {
    event.preventDefault();

    // 1. Capturar o botão de salvar
    const saveButton = document.querySelector('#form-bobina button[type="submit"]');

    const id = document.getElementById('bobina-id').value;
    const isNewBobina = !id; 
    
    // Use a função global para obter o usuário logado
    const loggedInUser = getLoggedInUser();

    const bobinaData = {
        tipo: document.getElementById('tipo-material').value,
        espessura: document.getElementById('espessura-chapa').value,
        largura: document.getElementById('largura-chapa').value,
        fornecedor: document.getElementById('fornecedor').value.trim(),
        notaFiscal: document.getElementById('nota-fiscal').value.trim(),
        dataRecebimento: document.getElementById('data-recebimento').value,
        lote: document.getElementById('lote').value.trim(),
        peso: parseFloat(document.getElementById('peso-bobina').value),
        naturezaOperacao: document.getElementById('natureza-operacao').value || 'Entrada',
        tipoMovimentacao: document.getElementById('tipo-movimentacao').value || 'Compra',
        observacao: document.getElementById('observacao').value.trim(),
        usuario: loggedInUser
    };

    // Validação do lote
    if (!bobinaData.lote || !/^L(0[1-9]|1[0-2])\d{2}-\d+-\d+$/.test(bobinaData.lote)) {
        if(window.NotificationManager) NotificationManager.show({ 
            title: 'Erro', 
            message: 'Formato de lote inválido. Use LmmAA-x-x.', 
            type: 'error' 
        });
        return;
    }

    // Validação de campos obrigatórios
    const requiredFields = ['tipo', 'espessura', 'largura', 'fornecedor', 'notaFiscal', 'dataRecebimento', 'lote', 'peso', 'naturezaOperacao', 'tipoMovimentacao'];
    for (const field of requiredFields) {
        if (bobinaData[field] === null || bobinaData[field] === undefined || bobinaData[field].toString().trim() === '') {
            if(window.NotificationManager) NotificationManager.show({ 
                title: 'Erro', 
                message: `O campo '${field}' é obrigatório.`, 
                type: 'error' 
            });
            return;
        }
    }

    // 2. Desabilitar o botão e mostrar feedback visual
    if (saveButton) {
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    }

    let url = 'https://virtualcriacoes.com/api/bobinas';
    let method = 'POST';

    if (id) {
        url += `/${id}`;
        method = 'PUT';
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bobinaData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha ao salvar a bobina.');
        }

        const result = await response.json();
        if(window.NotificationManager) NotificationManager.show({ 
            title: 'Sucesso', 
            message: result.message, 
            type: 'success' 
        });
        
        closeAllModals(); 
        
        if (isNewBobina) {
            await salvarMovimentacao('entrada', bobinaData, bobinaData.tipoMovimentacao, bobinaData.observacao);
        } else {
            await salvarMovimentacao('ajuste', bobinaData, `Atualização de Bobina - ${bobinaData.tipoMovimentacao}`, bobinaData.observacao);
        }
        
        loadData();

    } catch (error) {
        console.error('Erro ao salvar bobina:', error);
        if(window.NotificationManager) NotificationManager.show({ 
            title: 'Erro', 
            message: error.message, 
            type: 'error' 
        });
    } finally {
        // 3. Reabilitar o botão e restaurar o texto
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.innerHTML = 'Salvar'; 
        }
    }
}

// ===== CORREÇÃO ADICIONAL: FUNÇÃO confirmDelete =====
async function confirmDelete() {
    if (!currentEditId) return;

    try {
        // Fetch bobina data before deleting it to log the movement
        const bobinaToDeleteResponse = await fetch(`https://virtualcriacoes.com/api/bobinas/${currentEditId}`);
        if (!bobinaToDeleteResponse.ok) {
            throw new Error('Falha ao obter dados da bobina para log de exclusão.');
        }
        const bobinaData = await bobinaToDeleteResponse.json();

        const response = await fetch(`https://virtualcriacoes.com/api/bobinas/${currentEditId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha ao excluir a bobina.');
        }

        const result = await response.json();
        if(window.NotificationManager) NotificationManager.show({ 
            title: 'Sucesso', 
            message: result.message, 
            type: 'success' 
        });

        // Log the deletion movement after successful deletion
        await salvarMovimentacao('saida', bobinaData, 'Exclusão de Bobina', `Bobina removida: Lote ${bobinaData.Lote}`);

        // ===== CORREÇÃO: FECHAR O MODAL APÓS EXCLUSÃO =====
        closeAllModals(); // Adicionar esta linha para fechar o modal de confirmação

        loadData(); // Atualiza a tabela após a exclusão

    } catch (error) {
        console.error('Erro ao excluir bobina:', error);
        if(window.NotificationManager) NotificationManager.show({ 
            title: 'Erro', 
            message: error.message, 
            type: 'error' 
        });
        // Não fechar o modal em caso de erro
    }
}

// showMessage e getIconForMessageType são funções utilitárias.
// Mantenha-as se estiverem definidas aqui.
function showMessage(message, type) {
    if (window.NotificationManager) {
        window.NotificationManager.show({
            title: type.charAt(0).toUpperCase() + type.slice(1),
            message: message,
            type: type
        });
    } else {
        console.warn('NotificationManager não disponível. Mensagem:', message, 'Tipo:', type);
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

/**
 * Exporta a tabela de bobinas para um arquivo CSV.
 */
function exportTableToCSV() {
    let csvContent = [];
    const table = document.getElementById('tabela-bobinas');
    
    // Obter o cabeçalho da tabela
    const headers = [];
    table.querySelectorAll('thead th').forEach(th => {
        headers.push(`"${th.innerText.trim()}"`);
    });
    csvContent.push(headers.join(';'));
    
    // Obter as linhas de dados
    filteredData.forEach(bobina => {
        const rowData = [
            `"${bobina.DataRecebimento.split('-').reverse().join('/')}"`,
            `"${bobina.Fornecedor}"`,
            `"${bobina.NotaFiscal}"`,
            `"${bobina.Tipo}"`,
            `"${bobina.Lote}"`,
            `"${bobina.Espessura} mm"`,
            `"${bobina.Largura} mm"`,
            `"${Number(bobina.Peso).toFixed(2).replace('.', ',')}"`, // Formata o peso
            `"${bobina.NaturezaOperacao || 'N/A'}"`,
            `"${bobina.TipoMovimentacao || 'N/A'}"`,
            `"${bobina.Status}"`,
        ];
        csvContent.push(rowData.join(';'));
    });
    
    const csvString = csvContent.join('\n');
    const bom = '\ufeff';
    const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(bom + csvString);
    
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "estoque_bobinas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (window.NotificationManager) {
        NotificationManager.show({
            title: 'Sucesso',
            message: 'Relatório de estoque exportado com sucesso!',
            type: 'success'
        });
    }
}

function getIconForMessageType(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        case 'info': 
        default: return 'fa-info-circle';
    }
}