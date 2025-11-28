/**
 * produtos.js - Sistema de Produção COMPLETO E CORRIGIDO (Integrado ao Backend)
 */

// Banco de dados simulado (localStorage) - AGORA SERÃO PREENCHIDOS DA API
let producaoDatabase = [];
let bobinaDatabase = [];

// Em estoque.js e produtos.js
const loggedInUser = localStorage.getItem('sinergy_remember') || sessionStorage.getItem('sinergy_remember');

// Remove chaves de localStorage, não mais usadas para persistência direta.
const FATOR_SUCATA_ESPERADA = 0.012;

// Altura de cada lâmina em CENTÍMETROS para o cálculo da quantidade
const ALTURAS_LAMINAS_CM = {
    'Meia-Cana': 7.5, 
    'Meia-Cana Transvision': 7.5, 
    'Super-Cana': 10.0 
};

// Constantes - Fatores de peso por tipo de material (kg/lâmina)
const FATORES_MATERIAL = window.FATORES_MATERIAL || {
    'Eixo': 3.65,
    'Soleira': 1.00,
    'Guia 50': 1.25,
    'Guia 60': 1.50,
    'Guia 70': 1.75,
    'Guia 100': 2.75,
    
    // Isso por metro linear
    'Meia-Cana': 0.8,
    'Meia-Cana Transvision': 0.7,
    'Super-Cana': 1.48
};

// Variáveis de controle
let currentEditId = null;
let deletingItemId = null;
let currentPage = 1;
const itemsPerPage = 10;

// ===== FUNÇÕES UTILITÁRIAS/AUXILIARES (DEFINIDAS PRIMEIRO) =====

/**
 * Calcula o peso total de uma produção.
 * @param {object} producao O objeto de produção.
 * @returns {number} O peso total produzido.
 */
function calcularPesoTotalProducao(producao) {
    let total = 0;
    if (producao.itens) {
        producao.itens.forEach(item => {
            total += Number(item.Peso) || 0;
        });
    }
    return total;
}

/**
 * Calcula a sucata total gerada em uma produção.
 * @param {object} producao O objeto de produção.
 * @returns {number} A sucata total gerada.
 */
function calcularSucataTotalProducao(producao) {
    let total = 0;
    if (producao.itens) {
        producao.itens.forEach(item => {
            if (item.bobinasUsadas) {
                item.bobinasUsadas.forEach(bobinaUsada => {
                    total += Number(bobinaUsada.SucataGerada) || 0;
                });
            }
        });
    }
    return total;
}

/**
 * Calcula os volumes totais de uma produção.
 * @param {object} producao O objeto de produção.
 * @returns {number} Os volumes totais.
 */
function calcularVolumesTotaisProducao(producao) {
    let total = 0;
    if (producao.itens) {
        producao.itens.forEach(item => {
            total += Number(item.Volumes) || 0;
        });
    }
    return total;
}

/**
 * Obtém os conferentes únicos de uma produção.
 * @param {object} producao O objeto de produção.
 * @returns {Array<string>} Um array de conferentes únicos.
 */
function getConferentesUnicos(producao) {
    // Agora o conferente é um campo direto na produção
    if (producao.Conferente) {
        return [producao.Conferente];
    }
    return [];
}

/**
 * Formata um objeto Date para a string DD/MM/YYYY.
 * @param {Date} date O objeto Date a ser formatado.
 * @returns {string} A data formatada.
 */
function formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Renderiza a tabela de produções com os dados filtrados e paginados.
 * @param {Array<object>} producoes O array de objetos de produção a serem exibidos.
 */
function renderTable(producoes) {
    const tableBody = document.querySelector('#tabela-produtos tbody');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = producoes.slice(startIndex, endIndex);

    tableBody.innerHTML = '';
    if (paginatedData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="10" class="empty-state"><i class="fas fa-box-open"></i><p>Nenhuma produção encontrada.</p></td></tr>`;
        return;
    }

    paginatedData.forEach(producao => {
        const itensCount = producao.itens ? producao.itens.length : 0;
        const pesoTotalProducao = calcularPesoTotalProducao(producao);
        const sucataTotalProducao = calcularSucataTotalProducao(producao);
        const volumesTotais = calcularVolumesTotaisProducao(producao);
        const conferentesUnicos = getConferentesUnicos(producao);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-id="${producao.ID}" class="view-details-cell">${formatDate(producao.DataProducao)}</td>
            <td data-id="${producao.ID}" class="view-details-cell">${producao.NomeCliente || 'N/A'}</td>
            <td data-id="${producao.ID}" class="view-details-cell">${producao.NumPedido || 'N/A'}</td>
            <td data-id="${producao.ID}" class="view-details-cell">${itensCount}</td>
            <td data-id="${producao.ID}" class="view-details-cell">${pesoTotalProducao.toFixed(2)} kg</td>
            <td data-id="${producao.ID}" class="view-details-cell">${sucataTotalProducao.toFixed(2)} kg</td>
            <td data-id="${producao.ID}" class="view-details-cell">${conferentesUnicos.join(', ') || 'N/A'}</td>
            <td data-id="${producao.ID}" class="view-details-cell">${volumesTotais}</td>
            <td data-id="${producao.ID}" class="view-details-cell">${producao.NotaFiscal || 'N/A'}</td>
            <td class="table-actions">
                <button class="action-button view" data-id="${producao.ID}" title="Ver Detalhes"><i class="fas fa-eye"></i></button>
                <button class="action-button edit" data-id="${producao.ID}" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="action-button delete" data-id="${producao.ID}" data-nf="${producao.NotaFiscal}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    addTableEventListeners();
}

/**
 * Atualiza os controles de paginação.
 * @param {number} totalItems O número total de itens filtrados.
 */
function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    document.getElementById('total-pages').textContent = totalPages;
    document.getElementById('current-page').textContent = currentPage;
    document.getElementById('prev-page').disabled = currentPage <= 1;
    document.getElementById('next-page').disabled = currentPage >= totalPages;
}

/**
 * Aplica os filtros aos dados de produção e renderiza a tabela.
 */
function applyFilters() {
    const filterConferente = document.getElementById('filter-conferente').value;
    const filterMes = document.getElementById('filter-mes').value;
    const searchTerm = document.getElementById('search-produto').value.toLowerCase();

    let filteredProducoes = producaoDatabase.filter(producao => {
        // Filtrar por conferente
        if (filterConferente && producao.Conferente !== filterConferente) {
            return false;
        }

        // Filtrar por mês
        if (filterMes) {
            const producaoMonth = (producao.DataProducao.getMonth() + 1).toString().padStart(2, '0');
            if (producaoMonth !== filterMes) {
                return false;
            }
        }

        // Buscar por termo (Nota Fiscal ou Número do Pedido ou Nome do Cliente)
        if (searchTerm) {
            const notaFiscal = producao.NotaFiscal ? String(producao.NotaFiscal).toLowerCase() : '';
            const numPedido = producao.NumPedido ? String(producao.NumPedido).toLowerCase() : '';
            const nomeCliente = producao.NomeCliente ? String(producao.NomeCliente).toLowerCase() : '';

            if (!(notaFiscal.includes(searchTerm) || numPedido.includes(searchTerm) || nomeCliente.includes(searchTerm))) {
                return false;
            }
        }
        return true;
    });

    renderTable(filteredProducoes);
    updatePagination(filteredProducoes.length);
}

/**
 * Adiciona event listeners aos botões de ação da tabela (após renderização).
 */
function addTableEventListeners() {
    document.querySelectorAll('#tabela-produtos .action-button.view').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            viewProducaoDetails(parseInt(this.dataset.id));
        });
    });

    document.querySelectorAll('#tabela-produtos .action-button.edit').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            editarProducao(parseInt(this.dataset.id));
        });
    });

    document.querySelectorAll('#tabela-produtos .action-button.delete').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            confirmarExclusao(parseInt(this.dataset.id), this.dataset.nf);
        });
    });

    document.querySelectorAll('#tabela-produtos .view-details-cell').forEach(cell => {
        cell.addEventListener('click', function() {
            viewProducaoDetails(parseInt(this.dataset.id));
        });
    });
}

// ===== FUNÇÕES PRINCIPAIS (QUE UTILIZAM AS FUNÇÕES AUXILIARES) =====

async function loadDatabases() {
    try {
        // Carregar dados de produção
        const producaoResponse = await fetch('https://virtualcriacoes.com/sinergy/api/producoes');
        if (!producaoResponse.ok) throw new Error('Falha ao carregar produções.');
        producaoDatabase = await producaoResponse.json();

        // Processa datas e garante tipos numéricos corretos
        producaoDatabase.forEach(prod => {
            // As datas do backend vêm como string 'YYYY-MM-DD', convertemos para Date
            const parsedDate = new Date(prod.DataProducao); // Primeiro parseia a string GMT
            prod.DataProducao = new Date(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate());
            prod.itens = prod.itens.map(item => ({
                ID: item.ID,
                ProducaoID: item.ProducaoID,
                Tipo: item.Tipo,
                QtdLaminas: item.QtdLaminas,
                Altura: item.Altura ? parseFloat(item.Altura) : null, // NOVO: Processa a altura
                Comprimento: parseFloat(item.Comprimento),
                Volumes: item.Volumes,
                Peso: parseFloat(item.Peso),
                SucataEsperada: parseFloat(item.SucataEsperada || 0),
                bobinasUsadas: item.bobinasUsadas.map(bu => ({
                    ID: bu.ID,
                    ItemProducaoID: bu.ItemProducaoID,
                    BobinaID: bu.BobinaID,
                    PesoUsado: parseFloat(bu.PesoUsado),
                    SucataGerada: parseFloat(bu.SucataGerada || 0),
                    LoteBobina: bu.loteBobina,
                    TipoBobina: bu.tipoBobina
                }))
            }));
        });

        // Carregar dados de bobinas
        const bobinaResponse = await fetch('https://virtualcriacoes.com/sinergy/api/bobinas');
        if (!bobinaResponse.ok) throw new Error('Falha ao carregar bobinas.');
        const bobinaData = await bobinaResponse.json();
        bobinaDatabase = bobinaData.map(bob => ({
            ...bob,
            ID: parseInt(bob.ID), // CORREÇÃO CRUCIAL: Converte o ID para número
            Peso: parseFloat(bob.Peso),
            Largura: parseFloat(bob.Largura),
            Espessura: parseFloat(bob.Espessura)
        }));

        // debugProducaoData(); // Chamada para a nova função de debug
        applyFilters(); // Aplica filtros e renderiza a tabela
        updateSummary(); // Atualiza o resumo

    } catch (error) {
        console.error('Erro ao carregar bancos de dados da API:', error);
        if (window.NotificationManager) {
            NotificationManager.show({ title: 'Erro', message: `Erro ao carregar dados. Recarregue a página ou verifique o servidor.`, type: 'error' });
        }
    }
}

/**
 * Registra uma movimentação de produção no banco de dados via API.
 * @param {string} tipo Tipo da operação (Criação, Atualização, Exclusão).
 * @param {object} producao Objeto da produção envolvida.
 */
async function logProducaoMovimentacao(tipo, producao) {

    const loggedInUser = window.getLoggedInUser();

    const lotesUsados = new Set();
    producao.itens.forEach(item => {
        item.bobinasUsadas.forEach(bobinaUsada => {
            const lote = bobinaUsada.LoteBobina || (bobinaDatabase.find(b => b.ID === bobinaUsada.BobinaID)?.Lote);
            if (lote) lotesUsados.add(lote);
        });
    });
    const lotesString = lotesUsados.size > 0 ? Array.from(lotesUsados).join(', ') : 'N/A';

    const pesoTotal = calcularPesoTotalProducao(producao);

    const newMov = {
        timestamp: new Date().toISOString(),
        tipo: 'producao',
        descricao: `Produção Pedido: ${producao.NumPedido}`,
        lote: lotesString,
        pesoKg: pesoTotal,
        usuario: loggedInUser,
        origemDestino: producao.NomeCliente,
        observacao: `${tipo} da produção para o cliente ${producao.NomeCliente}.`,
        naturezaOperacao: tipo === 'Exclusão' ? 'Reversão' : 'Saída',
        tipoMovimentacao: `Produção (${tipo})`,
        usuario: loggedInUser // Novo campo adicionado
    };

    try {
        const response = await fetch('https://virtualcriacoes.com/sinergy/api/movimentacoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newMov)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha ao registrar movimentação de produção.');
        }
    } catch (error) {
        console.error('❌ PRODUTOS: Erro ao salvar movimentação de produção via API:', error);
        if (window.NotificationManager) NotificationManager.show({ title: 'Erro', message: `Falha ao registrar movimentação: ${error.message}`, type: 'error' });
    }
}

/**
 * Configuração dos listeners de eventos da página.
 */
function setupEventListeners() {
    const btnNovoProduto = document.getElementById('btn-novo-produto');
    if (btnNovoProduto) {
        btnNovoProduto.addEventListener('click', abrirNovaProducao);
    }

    const btnExportarProducoes = document.getElementById('btn-exportar-producoes');
    if (btnExportarProducoes) {
        btnExportarProducoes.addEventListener('click', exportarProducoesToCSV);
    }

    const filterConferente = document.getElementById('filter-conferente');
    const filterMes = document.getElementById('filter-mes');
    const searchProduto = document.getElementById('search-produto');

    if (filterConferente) filterConferente.addEventListener('change', applyFilters);
    if (filterMes) filterMes.addEventListener('change', applyFilters);
    if (searchProduto) searchProduto.addEventListener('input', applyFilters);

    const prevPage = document.getElementById('prev-page');
    const nextPage = document.getElementById('next-page');

    if (prevPage) {
        prevPage.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                applyFilters();
            }
        });
    }

    if (nextPage) {
        nextPage.addEventListener('click', function() {
            const totalPages = Math.ceil(getFilteredProducoes().length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                applyFilters();
            }
        });
    }

    const formProduto = document.getElementById('form-produto');
    if (formProduto) {
        formProduto.addEventListener('submit', function(event) {
            event.preventDefault();
            salvarProducao(event);
        });
    }

    document.querySelectorAll('.close-modal, .cancel-modal').forEach(button => {
        button.addEventListener('click', () => window.closeAllModals());
    });

    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            window.closeAllModals();
        }
    });

    const btnEditarProducao = document.getElementById('btn-editar-producao');
    const btnExcluirProducao = document.getElementById('btn-excluir-producao');
    const btnConfirmaExclusao = document.getElementById('btn-confirma-exclusao');

    if (btnEditarProducao) {
        btnEditarProducao.addEventListener('click', function() {
            fecharModal('modal-detalhes');
            editarProducao(currentEditId);
        });
    }

    if (btnExcluirProducao) {
        btnExcluirProducao.addEventListener('click', function() {
            const notaFiscal = document.getElementById('detalhe-nf').textContent.replace('NF: ', '');
            fecharModal('modal-detalhes');
            confirmarExclusao(currentEditId, notaFiscal);
        });
    }

    if (btnConfirmaExclusao) {
        btnConfirmaExclusao.addEventListener('click', function() {
            excluirProducao();
        });
    }
    
    // O botão original de adicionar item ainda é útil para abrir o modal
    const btnAddItem = document.getElementById('btn-add-item');
    if (btnAddItem) {
        btnAddItem.addEventListener('click', adicionarItem);
    }
}

/**
 * Abre o modal de nova produção, resetando o formulário.
 */
function abrirNovaProducao() {
    resetForm();

    document.getElementById('data-producao').valueAsDate = new Date();

    const conferenteProducaoInput = document.getElementById('conferente-producao');
    if (conferenteProducaoInput) {
        conferenteProducaoInput.value = '';
    }

    adicionarPrimeiroItem();

    document.getElementById('modal-produto').style.display = 'block';
    document.getElementById('modal-title').textContent = 'Nova Produção';

    currentEditId = null;
}

/**
 * Reseta o formulário de produção.
 */
function resetForm() {
    const form = document.getElementById('form-produto');
    form.reset();

    const itemsContainer = document.getElementById('items-container');
    itemsContainer.innerHTML = '';

    document.getElementById('producao-id').value = '';
}

/**
 * Fecha um modal específico ou todos os modais.
 * @param {string} modalId O ID do modal a ser fechado (opcional).
 */
function fecharModal(modalId = null) {
    if (modalId) {
        document.getElementById(modalId).style.display = 'none';
    } else {
        window.closeAllModals(); // Usa a função global closeAllModals
    }
    deletingItemId = null;
}

/**
 * Adiciona o primeiro item a uma nova produção.
 */
function adicionarPrimeiroItem() {
    const itemsContainer = document.getElementById('items-container');
    itemsContainer.innerHTML = '';
    adicionarItem();
}

/**
 * Adiciona um novo item à produção.
 */
function adicionarItem() {
    const itemsContainer = document.getElementById('items-container');
    const itemCount = itemsContainer.querySelectorAll('.item-container').length + 1;

    const template = document.getElementById('item-template');
    const clone = template.content.cloneNode(true);

    const newItem = clone.querySelector('.item-container');

    // Substitui os placeholders de forma segura dentro do novo item
    newItem.innerHTML = newItem.innerHTML.replace(/{index}/g, itemCount);
    newItem.querySelector('.item-number').textContent = itemCount;

    itemsContainer.appendChild(newItem);

    configurarEventosItem(newItem, itemCount);

    adicionarBobina(itemCount); // Adicionar primeira bobina
}


/**
 * CORREÇÃO - Configurar eventos do item com logs de debug
 */
function configurarEventosItem(itemElement, itemIndex) {

    const tipoMaterialSelect = itemElement.querySelector(`#tipo-material-${itemIndex}`);
    if (tipoMaterialSelect) {
        tipoMaterialSelect.addEventListener('change', function() {
            atualizarFator(this, itemIndex);
        });
    } else {
        console.error(`[ERRO] Select tipo-material-${itemIndex} não encontrado`);
    }

    const alturaInput = itemElement.querySelector(`#altura-porta-${itemIndex}`);
    if (alturaInput) {
        alturaInput.addEventListener('input', function() {
            calcularPesoLaminas(itemIndex);
        });
    }

    const qtdLaminasInput = itemElement.querySelector(`#qtd-laminas-${itemIndex}`);
    if (qtdLaminasInput) {
        qtdLaminasInput.addEventListener('input', function() {
            calcularPesoLaminas(itemIndex);
        });
    }

    const comprimentoInput = itemElement.querySelector(`#comp-value-${itemIndex}`);
    if (comprimentoInput) {
        comprimentoInput.addEventListener('input', function() {
            calcularPesoLaminas(itemIndex);
        });
    }

    const volumesInput = itemElement.querySelector(`#volumes-${itemIndex}`);
    if (volumesInput) {
        volumesInput.addEventListener('input', function() {
            calcularPesoLaminas(itemIndex);
        });
    }

    const btnRemoveItem = itemElement.querySelector('.btn-remove-item');
    if (btnRemoveItem) {
        btnRemoveItem.addEventListener('click', function() {
            removerItem(this);
        });
    }
    
    const btnAddItemBottom = itemElement.querySelector('.btn-add-item-bottom');
    if (btnAddItemBottom) {
        btnAddItemBottom.addEventListener('click', adicionarItem);
    }

    const btnAddBobina = itemElement.querySelector('.btn-add-bobina');
    if (btnAddBobina) {
        btnAddBobina.addEventListener('click', function() {
            adicionarBobina(itemIndex);
        });
    }

    // Configura eventos para as bobinas do item
    const bobinaContainers = itemElement.querySelectorAll('.bobina-container');
    bobinaContainers.forEach((bobina, bobinaIndex) => {
        configurarEventosBobina(bobina, itemIndex, bobinaIndex + 1);
    });
}

/**
 * CORREÇÃO - Função calcularPesoLaminas unificada
 */
function calcularPesoLaminas(itemIndex) {
    
    const tipoMaterialSelect = document.getElementById(`tipo-material-${itemIndex}`);
    const alturaInput = document.getElementById(`altura-porta-${itemIndex}`);
    const qtdLaminasInput = document.getElementById(`qtd-laminas-${itemIndex}`);
    const pesoTotalInput = document.getElementById(`peso-total-${itemIndex}`);
    const comprimentoInput = document.getElementById(`comp-value-${itemIndex}`);
    const sucataEsperadaInput = document.getElementById(`sucata-esperada-${itemIndex}`);
    const tipoMaterial = tipoMaterialSelect.value;
    const comprimento = parseFloat(comprimentoInput.value) || 0;
    const fator = FATORES_MATERIAL[tipoMaterial];
    const alturaLaminaCm = ALTURAS_LAMINAS_CM[tipoMaterial];

    if (!fator || comprimento <= 0) {
        if (pesoTotalInput) pesoTotalInput.value = '';
        if (sucataEsperadaInput) sucataEsperadaInput.value = '';
        atualizarResumoItem(itemIndex);
        return;
    }

    let qtdLaminas;
    let pesoTotal;

    if (alturaLaminaCm !== undefined) { 
        // LÓGICA PARA LÂMINAS (COM ALTURA)
        const altura = parseFloat(alturaInput?.value) || 0;
        
        if (altura > 0) {
            const alturaEmCm = altura * 100;
            qtdLaminas = Math.ceil(alturaEmCm / alturaLaminaCm);
            if (qtdLaminasInput) qtdLaminasInput.value = qtdLaminas;
        } else {
            qtdLaminas = 0;
            if (qtdLaminasInput) qtdLaminasInput.value = '';
        }
    } else { 
        // LÓGICA PARA OUTROS TIPOS (SEM ALTURA)
        qtdLaminas = parseInt(qtdLaminasInput?.value) || 0;
    }

    if (qtdLaminas > 0) {
        pesoTotal = fator * (qtdLaminas * comprimento);
        if (pesoTotalInput) pesoTotalInput.value = pesoTotal.toFixed(3);
        
        const sucataEsperada = pesoTotal * FATOR_SUCATA_ESPERADA;
        if (sucataEsperadaInput) sucataEsperadaInput.value = sucataEsperada.toFixed(3);
    } else {
        if (pesoTotalInput) pesoTotalInput.value = '';
        if (sucataEsperadaInput) sucataEsperadaInput.value = '';
    }
    
    atualizarResumoItem(itemIndex);
}

/**
 * Remove um item da produção.
 * @param {HTMLButtonElement} button O botão de remover clicado.
 */
function removerItem(button) {
    const itemContainer = button.closest('.item-container');
    const itemsContainer = document.getElementById('items-container');

    if (itemsContainer.querySelectorAll('.item-container').length > 1) {
        itemContainer.remove();
        atualizarNumerosItens();
    } else {
        if (window.NotificationManager) NotificationManager.show({ title: 'Atenção', message: 'É necessário pelo menos um item na produção', type: 'warning' });
    }
}

/**
 * Atualiza os números de todos os itens após uma remoção.
 */
function atualizarNumerosItens() {
    const itemContainers = document.querySelectorAll('.item-container');

    itemContainers.forEach((container, index) => {
        const itemNumber = index + 1;
        container.querySelector('.item-number').textContent = itemNumber;

        // Atualizar IDs
        container.querySelectorAll('[id]').forEach(element => {
            const oldId = element.id;
            const newId = oldId.replace(/-\d+/, `-${itemNumber}`);
            element.id = newId;
            if (element.tagName === 'LABEL' && element.htmlFor) {
                element.htmlFor = element.htmlFor.replace(/-\d+/, `-${itemNumber}`);
            }
        });

        const bobinasContainer = container.querySelector('.bobinas-container');
        if (bobinasContainer) {
            bobinasContainer.id = `bobinas-container-${itemNumber}`;
        }
    });
}

/**
 * Adiciona uma nova bobina a um item de produção,
 * carregando apenas as bobinas com peso disponível.
 * @param {number} itemIndex O índice do item ao qual a bobina será adicionada.
 */
function adicionarBobina(itemIndex) {
    const bobinasContainer = document.getElementById(`bobinas-container-${itemIndex}`);
    if (!bobinasContainer) return;

    const bobinaCount = bobinasContainer.querySelectorAll('.bobina-container').length + 1;

    const template = document.getElementById('bobina-template');
    const clone = template.content.cloneNode(true);

    let bobinaHtml = clone.firstElementChild.outerHTML;
    bobinaHtml = bobinaHtml.replace(/{itemIndex}/g, itemIndex);
    bobinaHtml = bobinaHtml.replace(/{bobinaIndex}/g, bobinaCount);

    const bobinaElement = document.createElement('div');
    bobinaElement.innerHTML = bobinaHtml;
    const newBobina = bobinaElement.firstElementChild;

    newBobina.querySelector('.bobina-number').textContent = bobinaCount;
    bobinasContainer.appendChild(newBobina);

    const selectBobina = newBobina.querySelector(`#lote-bobina-${itemIndex}-${bobinaCount}`);
    
    // CORREÇÃO: Coleta todas as bobinas já alocadas NO FORMULÁRIO INTEIRO,
    // com o peso usado + sucata para dedução.
    const allBobinasUsed = [];
    document.querySelectorAll('.item-container').forEach(item => {
        item.querySelectorAll('.bobina-container').forEach(bobinaEl => {
            const bobinaId = parseInt(bobinaEl.querySelector('.lote-bobina').value);
            const pesoUsado = parseFloat(bobinaEl.querySelector('.peso-usado').value);
            const sucataGerada = parseFloat(bobinaEl.querySelector('.sucata-gerada').value);

            if (bobinaId) {
                allBobinasUsed.push({
                    BobinaID: bobinaId,
                    PesoUsado: pesoUsado || 0,
                    SucataGerada: sucataGerada || 0
                });
            }
        });
    });

    carregarBobinasDisponiveis(selectBobina, null, allBobinasUsed);

    configurarEventosBobina(newBobina, itemIndex, bobinaCount);
}

/**
 * Configura os eventos para uma bobina recém-adicionada a um item.
 * @param {HTMLElement} bobinaElement O elemento HTML da bobina.
 * @param {number} itemIndex O índice do item pai.
 * @param {number} bobinaIndex O índice da bobina.
 */
function configurarEventosBobina(bobinaElement, itemIndex, bobinaIndex) {
    
    const bobinaSelect = bobinaElement.querySelector(`#lote-bobina-${itemIndex}-${bobinaIndex}`);
    if (bobinaSelect) {
        bobinaSelect.addEventListener('change', function() {
            manipularMudancaBobina(this, itemIndex, bobinaIndex);
        });
    }

    const pesoUsadoInput = bobinaElement.querySelector(`#peso-usado-${itemIndex}-${bobinaIndex}`);
    const sucataGeradaInput = bobinaElement.querySelector(`#sucata-gerada-${itemIndex}-${bobinaIndex}`);

    if (pesoUsadoInput) {
        pesoUsadoInput.addEventListener('input', function() {
            calcularPesosTotais(itemIndex, bobinaIndex);
        });
    }

    if (sucataGeradaInput) {
        sucataGeradaInput.addEventListener('input', function() {
            calcularPesosTotais(itemIndex, bobinaIndex);
        });
    }

    const btnRemoveBobina = bobinaElement.querySelector('.btn-remove-bobina');
    if (btnRemoveBobina) {
        btnRemoveBobina.addEventListener('click', function() {
            removerBobina(this, itemIndex);
        });
    }
}

/**
 * Carrega as bobinas disponíveis para o select de seleção,
 * considerando o peso já alocado em outros itens da mesma produção.
 * @param {HTMLSelectElement} selectElement O elemento select a ser preenchido.
 * @param {number} idBobinaSelecionada O ID da bobina selecionada (para edição).
 * @param {Array<object>} bobinasUsadasAtualmente Array de bobinas já usadas no formulário.
 */
function carregarBobinasDisponiveis(selectElement, idBobinaSelecionada = null, bobinasUsadasAtualmente = []) {
    if (!selectElement) return;

    selectElement.innerHTML = '<option value="">Selecione uma bobina</option>';

    // Mapeia o peso já alocado por bobina no formulário atual
    const pesoAlocadoPorBobina = {};
    bobinasUsadasAtualmente.forEach(bu => {
        if (!pesoAlocadoPorBobina[bu.BobinaID]) {
            pesoAlocadoPorBobina[bu.BobinaID] = 0;
        }
        pesoAlocadoPorBobina[bu.BobinaID] += parseFloat(bu.PesoUsado || 0) + parseFloat(bu.SucataGerada || 0);
    });

    const bobinasParaExibir = bobinaDatabase.filter(bobina => {
        const pesoOriginal = Number(bobina.Peso);
        const pesoJaAlocado = pesoAlocadoPorBobina[bobina.ID] || 0;
        const pesoDisponivelCalculado = pesoOriginal - pesoJaAlocado;
        
        // A bobina deve ser exibida se tiver peso disponível ou se for a bobina já selecionada
        return pesoDisponivelCalculado > 0 || bobina.ID === idBobinaSelecionada;
    });

    if (bobinasParaExibir.length === 0) {
        selectElement.innerHTML += '<option disabled>Nenhuma bobina disponível em estoque</option>';
        return;
    }
    
    const idsUnicos = new Set();
    const bobinasUnicas = bobinasParaExibir.filter(bobina => {
        if (idsUnicos.has(bobina.ID)) {
            return false;
        }
        idsUnicos.add(bobina.ID);
        return true;
    });

    bobinasUnicas.forEach(bobina => {
        const pesoOriginal = Number(bobina.Peso);
        const pesoJaAlocado = pesoAlocadoPorBobina[bobina.ID] || 0;
        const pesoDisponivelCalculado = pesoOriginal - pesoJaAlocado;

        const option = document.createElement('option');
        option.value = bobina.ID;
        
        // CORREÇÃO CRÍTICA AQUI
        // Verifica se a bobina em questão é a mesma que está sendo alocada no item atual
        const pesoExcluidoDaPropriaLinha = (bobina.ID === idBobinaSelecionada) ? pesoAlocadoPorBobina[bobina.ID] : 0;
        const pesoExibido = (pesoDisponivelCalculado + pesoExcluidoDaPropriaLinha).toFixed(2);
        
        const avisoZerada = parseFloat(pesoExibido) <= 0 ? ' (Estoque Zerado)' : '';
        
        // Monta a string de exibição para o <option> com o peso deduzido
        option.textContent = `${bobina.Lote} - ${bobina.Tipo} - ${pesoExibido}kg${avisoZerada}`;
        
        selectElement.appendChild(option);
    });
}

/**
 * Manipula a mudança de seleção de bobina.
 * @param {HTMLSelectElement} select O select da bobina.
 * @param {number} itemIndex O índice do item pai.
 * @param {number} bobinaIndex O índice da bobina.
 */
function manipularMudancaBobina(select, itemIndex, bobinaIndex) {
    const bobinaId = parseInt(select.value);
    const pesoDisponivelElement = document.getElementById(`peso-disponivel-${itemIndex}-${bobinaIndex}`);
    const pesoUsadoInput = document.getElementById(`peso-usado-${itemIndex}-${bobinaIndex}`);
    
    // Zera os campos se nenhuma bobina for selecionada
    if (!bobinaId) {
        if (pesoDisponivelElement) pesoDisponivelElement.textContent = '0 kg';
        if (pesoUsadoInput) pesoUsadoInput.value = '';
        calcularPesosTotais(itemIndex, bobinaIndex);
        return;
    }

    const bobina = bobinaDatabase.find(b => b.ID === bobinaId);
    if (!bobina) {
        console.error(`[ERRO] Bobina com ID ${bobinaId} não encontrada no banco de dados local.`);
        if (pesoDisponivelElement) pesoDisponivelElement.textContent = '0 kg';
        if (pesoUsadoInput) pesoUsadoInput.value = '';
        calcularPesosTotais(itemIndex, bobinaIndex);
        return;
    }
    
    // Coleta todo o peso alocado para esta bobina em OUTRAS posições do formulário
    let pesoAlocadoEmOutrasLinhas = 0;
    document.querySelectorAll('.item-container').forEach((itemContainer, currentItemIndex) => {
        const currentItemNumber = currentItemIndex + 1;
        itemContainer.querySelectorAll('.bobina-container').forEach((bobinaEl, currentBobinaIndex) => {
            const currentBobinaNumber = currentBobinaIndex + 1;
            const idUsada = parseInt(bobinaEl.querySelector('select').value);
            
            if (idUsada === bobinaId) {
                // Só soma se NÃO for a linha atual que está sendo editada
                const isCurrentLine = (currentItemNumber === itemIndex && currentBobinaNumber === bobinaIndex);
                if (!isCurrentLine) {
                    const pesoUsado = parseFloat(bobinaEl.querySelector('.peso-usado').value) || 0;
                    const sucataGerada = parseFloat(bobinaEl.querySelector('.sucata-gerada').value) || 0;
                    const totalUsadoNaLinha = pesoUsado + sucataGerada;
                
                    pesoAlocadoEmOutrasLinhas += totalUsadoNaLinha;
                }
            }
        });
    });

    // Se estivermos editando uma produção, adiciona o peso original de volta
    const producaoId = document.getElementById('producao-id').value;
    let pesoOriginalConsumido = 0;
    if (producaoId) {
        const producaoOriginal = producaoDatabase.find(p => p.ID === parseInt(producaoId));
        if (producaoOriginal) {
            producaoOriginal.itens.forEach(item => {
                item.bobinasUsadas.forEach(bu => {
                    if (bu.BobinaID === bobinaId) {
                        pesoOriginalConsumido += Number(bu.PesoUsado) + Number(bu.SucataGerada || 0);
                    }
                });
            });
        }
    }

    // Calcula o peso disponível real
    const pesoDisponivelReal = Number(bobina.Peso) - pesoAlocadoEmOutrasLinhas + pesoOriginalConsumido;
    
    // Preenche o peso disponível
    if (pesoDisponivelElement) {
        pesoDisponivelElement.textContent = `${pesoDisponivelReal.toFixed(2)} kg`;
    }

    calcularPesosTotais(itemIndex, bobinaIndex);
}

/**
 * Calcula os pesos totais de uso da bobina e o restante.
 * @param {number} itemIndex O índice do item pai.
 * @param {number} bobinaIndex O índice da bobina.
 */
function calcularPesosTotais(itemIndex, bobinaIndex) {
    
    const bobinaSelect = document.getElementById(`lote-bobina-${itemIndex}-${bobinaIndex}`);
    const pesoUsadoInput = document.getElementById(`peso-usado-${itemIndex}-${bobinaIndex}`);
    const sucataGeradaInput = document.getElementById(`sucata-gerada-${itemIndex}-${bobinaIndex}`);
    const pesoTotalItemInput = document.getElementById(`peso-total-${itemIndex}`);

    if (!bobinaSelect || !pesoUsadoInput || !sucataGeradaInput || !pesoTotalItemInput) {
        console.error(`[ERRO] Elementos de bobina não encontrados para Item ${itemIndex}, Bobina ${bobinaIndex}`);
        return;
    }

    const bobinaId = parseInt(bobinaSelect.value);
    let pesoUsado = Number(pesoUsadoInput.value) || 0;
    const sucataGerada = Number(sucataGeradaInput.value) || 0;
    
    // Sugerir um valor para o campo "Peso Usado" se o item tiver apenas uma bobina e o campo estiver vazio
    if (pesoTotalItemInput && pesoTotalItemInput.value && pesoUsadoInput.value === '') {
        const totalBobinasNoItem = document.getElementById(`bobinas-container-${itemIndex}`).querySelectorAll('.bobina-container').length;
        if (totalBobinasNoItem === 1) {
            pesoUsado = Number(pesoTotalItemInput.value) || 0;
            pesoUsadoInput.value = pesoUsado.toFixed(2);
        }
    }

    const totalUsadoNaLinha = pesoUsado + sucataGerada;

    const bobina = bobinaDatabase.find(b => b.ID === bobinaId);
    let pesoDisponivelReal = (bobina) ? Number(bobina.Peso) : 0;
    
    // Se estivermos editando, adicionamos o peso original de volta para o cálculo
    const producaoId = document.getElementById('producao-id').value;
    if (producaoId) {
        const producaoOriginal = producaoDatabase.find(p => p.ID === parseInt(producaoId));
        if (producaoOriginal) {
            producaoOriginal.itens.forEach(item => {
                item.bobinasUsadas.forEach(bu => {
                    if (bu.BobinaID === bobinaId) {
                        const pesoOriginalConsumido = Number(bu.PesoUsado) + Number(bu.SucataGerada || 0);
                        pesoDisponivelReal += pesoOriginalConsumido;
                    }
                });
            });
        }
    }

    const pesoDisponivelElement = document.getElementById(`peso-disponivel-${itemIndex}-${bobinaIndex}`);
    if (pesoDisponivelElement) {
        pesoDisponivelElement.textContent = `${pesoDisponivelReal.toFixed(2)} kg`;
    }

    const pesoTotalUsadoElement = document.getElementById(`peso-total-usado-${itemIndex}-${bobinaIndex}`);
    if (pesoTotalUsadoElement) {
        pesoTotalUsadoElement.textContent = `${totalUsadoNaLinha.toFixed(2)} kg`;
    }

    const pesoRestante = pesoDisponivelReal - totalUsadoNaLinha;
    const pesoRestanteElement = document.getElementById(`peso-restante-${itemIndex}-${bobinaIndex}`);

    if (pesoRestanteElement) {
        pesoRestanteElement.textContent = `${pesoRestante.toFixed(2)} kg`;
        pesoRestanteElement.classList.toggle('weight-error', pesoRestante < 0);
        pesoUsadoInput.setCustomValidity(pesoRestante < 0 ? `Peso excede o disponível na bobina por ${Math.abs(pesoRestante).toFixed(2)} kg` : '');
    }
    
    // CORREÇÃO: Chamada para atualizar o resumo do item no final
    atualizarResumoItem(itemIndex);
}

/**
 * Remove uma bobina de um item de produção.
 * @param {HTMLButtonElement} button O botão de remover clicado.
 */
function removerBobina(button, itemIndex) {
    const bobinaContainer = button.closest('.bobina-container');
    const bobinasContainer = document.getElementById(`bobinas-container-${itemIndex}`);

    if (bobinasContainer.querySelectorAll('.bobina-container').length > 1) {
        bobinaContainer.remove();
        atualizarResumoItem(itemIndex);
    } else {
        if (window.NotificationManager) NotificationManager.show({ title: 'Atenção', message: 'É necessário pelo menos uma bobina por item', type: 'warning' });
    }
}

/**
 * Atualiza o resumo de pesos e sucata para um item de produção.
 * @param {number} itemIndex O índice do item.
 */
function atualizarResumoItem(itemIndex) {
    const bobinasContainer = document.getElementById(`bobinas-container-${itemIndex}`);
    if (!bobinasContainer) return;

    let pesoBobinasTotal = 0;
    let sucataBobinasTotal = 0;

    const bobinaContainers = bobinasContainer.querySelectorAll('.bobina-container');
    bobinaContainers.forEach(container => {
        const pesoUsadoInput = container.querySelector('.peso-usado');
        const sucataGeradaInput = container.querySelector('.sucata-gerada');

        if (pesoUsadoInput && sucataGeradaInput) {
            pesoBobinasTotal += Number(pesoUsadoInput.value) || 0;
            sucataBobinasTotal += Number(sucataGeradaInput.value) || 0;
        }
    });

    const pesoBobinasTotalElement = document.getElementById(`peso-bobinas-total-${itemIndex}`);
    const sucataBobinasTotalElement = document.getElementById(`sucata-bobinas-total-${itemIndex}`);
    const pesoRestanteAlocarElement = document.getElementById(`peso-restante-alocar-${itemIndex}`);

    if (pesoBobinasTotalElement) {
        pesoBobinasTotalElement.textContent = `${pesoBobinasTotal.toFixed(2)} kg`;
    }

    if (sucataBobinasTotalElement) {
        sucataBobinasTotalElement.textContent = `${sucataBobinasTotal.toFixed(2)} kg`;
    }

    const pesoTotalInput = document.getElementById(`peso-total-${itemIndex}`);
    if (pesoTotalInput && pesoRestanteAlocarElement) {
        const pesoTotal = Number(pesoTotalInput.value) || 0;
        const pesoRestante = pesoTotal - pesoBobinasTotal;

        if (pesoRestante > 0) {
            pesoRestanteAlocarElement.textContent = `${pesoRestante.toFixed(2)} kg`;
            pesoRestanteAlocarElement.classList.add('weight-warning');
            pesoRestanteAlocarElement.classList.remove('weight-error');
        } else if (pesoRestante < 0) {
            pesoRestanteAlocarElement.textContent = `Excesso de ${Math.abs(pesoRestante).toFixed(2)} kg`;
            pesoRestanteAlocarElement.classList.add('weight-error');
            pesoRestanteAlocarElement.classList.remove('weight-warning');
        } else {
            pesoRestanteAlocarElement.textContent = `0.00 kg`;
            pesoRestanteAlocarElement.classList.remove('weight-warning', 'weight-error');
        }
    }
}

/**
 * Abre o modal de detalhes de uma produção.
 * @param {number} id O ID da produção a ser visualizada.
 */
function viewProducaoDetails(id) {
    const producao = producaoDatabase.find(p => p.ID === id);
    if (!producao) return;

    currentEditId = id; // Define o ID para possível edição/exclusão

    document.getElementById('detalhe-cliente').textContent = producao.NomeCliente || 'Cliente Desconhecido';
    document.getElementById('detalhe-nf').textContent = `NF: ${producao.NotaFiscal || 'N/A'}`;
    document.getElementById('detalhe-pedido').textContent = `Pedido: ${producao.NumPedido || 'N/A'}`;
    document.getElementById('detalhe-data-principal').textContent = formatDate(producao.DataProducao);

    const itemsDetailsContainer = document.getElementById('items-details-container');
    itemsDetailsContainer.innerHTML = '';
    document.getElementById('item-count').textContent = `(${producao.itens.length} itens)`;

    producao.itens.forEach((item, index) => {
        const itemDetailTemplate = document.getElementById('item-detail-template');
        const clone = itemDetailTemplate.content.cloneNode(true);
        const itemDetailElement = clone.firstElementChild;

        itemDetailElement.querySelector('.item-detail-number').textContent = index + 1;
        itemDetailElement.querySelector('.item-detail-tipo').textContent = item.Tipo;
        itemDetailElement.querySelector('.qtd-laminas-value').textContent = item.QtdLaminas;
        itemDetailElement.querySelector('.comp-value').textContent = item.Comprimento + ' m';
        itemDetailElement.querySelector('.peso-value').textContent = item.Peso.toFixed(2) + ' kg';
        itemDetailElement.querySelector('.sucata-value').textContent = item.SucataEsperada.toFixed(2) + ' kg';
        itemDetailElement.querySelector('.volumes-value').textContent = item.Volumes;

        const bobinasDetailList = itemDetailElement.querySelector('.bobinas-detail-list');
        bobinasDetailList.innerHTML = '';

        if (item.bobinasUsadas && item.bobinasUsadas.length > 0) {
            item.bobinasUsadas.forEach(bobinaUsada => {
                const bobinaDetailTemplate = document.getElementById('bobina-detail-template');
                const bobinaClone = bobinaDetailTemplate.content.cloneNode(true);
                const bobinaDetailElement = bobinaClone.firstElementChild;

                bobinaDetailElement.querySelector('.bobina-lote').textContent = bobinaUsada.LoteBobina || 'Lote Desconhecido';
                bobinaDetailElement.querySelector('.bobina-peso-usado').textContent = bobinaUsada.PesoUsado.toFixed(2);
                bobinaDetailElement.querySelector('.bobina-sucata').textContent = bobinaUsada.SucataGerada.toFixed(2);
                bobinasDetailList.appendChild(bobinaDetailElement);
            });
        } else {
            bobinasDetailList.innerHTML = '<div class="bobina-detail-item">Nenhuma bobina utilizada registrada.</div>';
        }

        itemsDetailsContainer.appendChild(itemDetailElement);
    });

    document.getElementById('detalhe-peso-total').textContent = calcularPesoTotalProducao(producao).toFixed(2) + ' kg';
    document.getElementById('detalhe-sucata-total').textContent = calcularSucataTotalProducao(producao).toFixed(2) + ' kg';
    document.getElementById('detalhe-volumes-total').textContent = calcularVolumesTotaisProducao(producao);

    document.getElementById('modal-detalhes').style.display = 'block';
}

/**
 * Abre o modal de edição de produção e preenche os campos.
 * @param {number} id O ID da produção a ser editada.
 */
function editarProducao(id) {
    const producao = producaoDatabase.find(p => p.ID === id);
    if (!producao) {
        if (window.NotificationManager) NotificationManager.show({ title: 'Erro', message: 'Produção não encontrada para edição.', type: 'error' });
        return;
    }

    currentEditId = id;
    document.getElementById('modal-title').textContent = 'Editar Produção';
    document.getElementById('producao-id').value = producao.ID;
    document.getElementById('nota-fiscal').value = producao.NotaFiscal || '';
    document.getElementById('nome-cliente').value = producao.NomeCliente || '';
    document.getElementById('num-pedido').value = producao.NumPedido || '';
    document.getElementById('data-producao').valueAsDate = new Date(producao.DataProducao);
    document.getElementById('conferente-producao').value = producao.Conferente || '';

    const itemsContainer = document.getElementById('items-container');
    itemsContainer.innerHTML = ''; // Limpa itens existentes

    if (producao.itens && producao.itens.length > 0) {
        producao.itens.forEach((item, itemIndex) => {
            adicionarItemPreenchido(item, itemIndex + 1);
        });
    } else {
        adicionarPrimeiroItem(); // Adiciona um item vazio se não houver itens
    }

    document.getElementById('modal-produto').style.display = 'block';
}

// Função revisada para preencher os dados de um item de produção
function adicionarItemPreenchido(item, itemNumber) {
    const itemsContainer = document.getElementById('items-container');
    const template = document.getElementById('item-template');
    const clone = template.content.cloneNode(true);

    const newItem = clone.querySelector('.item-container');

    // Substitui os placeholders de forma segura dentro do novo item
    newItem.innerHTML = newItem.innerHTML.replace(/{index}/g, itemNumber);
    newItem.querySelector('.item-number').textContent = itemNumber;
    itemsContainer.appendChild(newItem);

    // Preenche os campos do item
    newItem.querySelector('.item-id').value = item.ID;
    newItem.querySelector(`#tipo-material-${itemNumber}`).value = item.Tipo;

    // NOVO: Adicione esta linha para preencher o campo de altura com o valor salvo
    const alturaInput = newItem.querySelector(`#altura-porta-${itemNumber}`);
    if (alturaInput) {
        alturaInput.value = item.Altura !== null ? item.Altura : '';
    }

    newItem.querySelector(`#qtd-laminas-${itemNumber}`).value = item.QtdLaminas;
    newItem.querySelector(`#comp-value-${itemNumber}`).value = item.Comprimento;
    newItem.querySelector(`#volumes-${itemNumber}`).value = item.Volumes;
    newItem.querySelector(`#peso-total-${itemNumber}`).value = item.Peso.toFixed(3);
    newItem.querySelector(`#sucata-esperada-${itemNumber}`).value = item.SucataEsperada.toFixed(3);

    // Configura o fator informativo
    const fatorInfo = newItem.querySelector(`#fator-info-${itemNumber}`);
    const fator = FATORES_MATERIAL[item.Tipo];
    if (fator) {
        fatorInfo.textContent = `Fator: ${fator} kg por metro linear`;
    } else {
        fatorInfo.textContent = '';
    }

    // Configura eventos para o item
    configurarEventosItem(newItem, itemNumber);

    const bobinasContainer = newItem.querySelector(`#bobinas-container-${itemNumber}`);
    bobinasContainer.innerHTML = ''; // Limpa bobinas existentes para este item

    if (item.bobinasUsadas && item.bobinasUsadas.length > 0) {
        item.bobinasUsadas.forEach((bobinaUsada, bobinaIndex) => {
            adicionarBobinaPreenchida(bobinaUsada, itemNumber, bobinaIndex + 1);
        });
    } else {
        adicionarBobina(itemNumber); // Adiciona uma bobina vazia se não houver
    }
    
    atualizarFator(newItem.querySelector(`#tipo-material-${itemNumber}`), itemNumber);
    atualizarResumoItem(itemNumber); // Atualiza o resumo do item após preencher
}

/**
 * Adiciona uma bobina ao formulário de item (para edição), preenchendo-o com dados existentes.
 * @param {object} bobinaUsada O objeto de bobina utilizada.
 * @param {number} itemIndex O índice do item pai.
 * @param {number} bobinaNumber O número da bobina.
 */
function adicionarBobinaPreenchida(bobinaUsada, itemIndex, bobinaNumber) {
    const bobinasContainer = document.getElementById(`bobinas-container-${itemIndex}`);
    const template = document.getElementById('bobina-template');
    const clone = template.content.cloneNode(true);

    let bobinaHtml = clone.firstElementChild.outerHTML;
    bobinaHtml = bobinaHtml.replace(/{itemIndex}/g, itemIndex);
    bobinaHtml = bobinaHtml.replace(/{bobinaIndex}/g, bobinaNumber);

    const bobinaElement = document.createElement('div');
    bobinaElement.innerHTML = bobinaHtml;
    const newBobina = bobinaElement.firstElementChild;

    newBobina.querySelector('.bobina-number').textContent = bobinaNumber;
    bobinasContainer.appendChild(newBobina);

    // Preenche os campos da bobina
    newBobina.querySelector('.bobina-id').value = bobinaUsada.ID;
    newBobina.querySelector('.bobina-original-id').value = bobinaUsada.BobinaID;
    newBobina.querySelector('.peso-original').value = bobinaUsada.PesoUsado;
    newBobina.querySelector('.sucata-original').value = bobinaUsada.SucataGerada;

    const selectBobina = newBobina.querySelector(`#lote-bobina-${itemIndex}-${bobinaNumber}`);
    carregarBobinasDisponiveis(selectBobina, bobinaUsada.BobinaID); // Passa o ID da bobina para garantir que apareça se o estoque for 0
    selectBobina.value = bobinaUsada.BobinaID; // Seleciona a bobina correta

    newBobina.querySelector(`#peso-usado-${itemIndex}-${bobinaNumber}`).value = bobinaUsada.PesoUsado.toFixed(2);
    newBobina.querySelector(`#sucata-gerada-${itemIndex}-${bobinaNumber}`).value = bobinaUsada.SucataGerada.toFixed(2);

    // Configura eventos
    configurarEventosBobina(newBobina, itemIndex, bobinaNumber);
    calcularPesosTotais(itemIndex, bobinaNumber); // Recalcula informações de peso
}

async function salvarProducao(event) {
    if (event) event.preventDefault();

    // 1. Capturar o botão de salvar
    const saveButton = document.querySelector('#form-produto button[type="submit"]');

    const producaoId = document.getElementById('producao-id').value;
    const notaFiscal = document.getElementById('nota-fiscal').value;
    const numPedido = document.getElementById('num-pedido').value;
    const nomeCliente = document.getElementById('nome-cliente').value;
    const dataProducao = document.getElementById('data-producao').value;
    const conferenteProducao = document.getElementById('conferente-producao')?.value || null;

    if (!numPedido || !dataProducao || !nomeCliente) {
        if (window.NotificationManager) NotificationManager.show({ title: 'Erro de Validação', message: 'Preencha todos os campos principais (Número do Pedido, Nome do Cliente, Data de Produção).', type: 'error' });
        return false;
    }
    if (!conferenteProducao) {
        if (window.NotificationManager) NotificationManager.show({ title: 'Erro de Validação', message: 'Por favor, selecione um Conferente para a produção.', type: 'error' });
        return false;
    }

    const itens = [];
    let formValido = true;
    const itemContainers = document.querySelectorAll('.item-container');

    if (itemContainers.length === 0) {
        if (window.NotificationManager) NotificationManager.show({ title: 'Erro', message: 'Adicione pelo menos um item à produção.', type: 'error' });
        return false;
    }

    itemContainers.forEach((itemContainer, itemIndex) => {
        if (!formValido) return;
        const itemNumber = itemIndex + 1;
        const tipoMaterial = itemContainer.querySelector(`#tipo-material-${itemNumber}`).value;
        
        const alturaInput = itemContainer.querySelector(`#altura-porta-${itemNumber}`);
        const altura = alturaInput && alturaInput.value ? parseFloat(alturaInput.value) : null; 

        const qtdLaminas = parseInt(itemContainer.querySelector(`#qtd-laminas-${itemNumber}`).value);
        const comprimento = parseFloat(itemContainer.querySelector(`#comp-value-${itemNumber}`).value);
        const volumes = parseInt(itemContainer.querySelector(`#volumes-${itemNumber}`).value);
        const pesoTotal = parseFloat(itemContainer.querySelector(`#peso-total-${itemNumber}`).value);
        const sucataEsperada = parseFloat(itemContainer.querySelector(`#sucata-esperada-${itemNumber}`).value);

        const itemId = itemContainer.querySelector('.item-id').value || null;

        if (!tipoMaterial || (tipoMaterial === 'Meia-Cana' && isNaN(altura)) || isNaN(comprimento) || comprimento <= 0 || isNaN(volumes)) {
            if (window.NotificationManager) NotificationManager.show({ title: 'Erro de Validação', message: `Preencha todos os campos do item ${itemNumber} corretamente.`, type: 'error' });
            formValido = false;
        }

        const bobinasUsadas = [];
        itemContainer.querySelectorAll('.bobina-container').forEach(bobinaContainer => {
            const bobinaSelect = bobinaContainer.querySelector(`select[id^="lote-bobina-"]`);
            if (bobinaSelect && bobinaSelect.value) {
                const bobinaId = parseInt(bobinaSelect.value);
                const pesoUsado = parseFloat(bobinaContainer.querySelector(`input[id^="peso-usado-"]`).value);
                const sucataGerada = parseFloat(bobinaContainer.querySelector(`input[id^="sucata-gerada-"]`).value || 0);

                if (!bobinaId || isNaN(pesoUsado) || pesoUsado < 0 || isNaN(sucataGerada) || sucataGerada < 0) {
                    if (window.NotificationManager) NotificationManager.show({ title: 'Erro de Validação', message: `Verifique os pesos da bobina no item ${itemNumber}.`, type: 'error' });
                    formValido = false;
                }
                const pesoRestanteElement = bobinaContainer.querySelector(`span[id^="peso-restante-"]`);
                if (pesoRestanteElement && pesoRestanteElement.classList.contains('weight-error')) {
                    if (window.NotificationManager) NotificationManager.show({ title: 'Erro de Validação', message: `Peso da bobina excedido no item ${itemNumber}.`, type: 'error' });
                    formValido = false;
                }
                bobinasUsadas.push({ BobinaID: bobinaId, PesoUsado: pesoUsado, SucataGerada: sucataGerada });
            } else {
                if (window.NotificationManager) NotificationManager.show({ title: 'Erro de Validação', message: `Selecione uma bobina para cada slot no item ${itemNumber}.`, type: 'error' });
                formValido = false;
            }
        });

        if (bobinasUsadas.length === 0 && formValido) {
            if (window.NotificationManager) NotificationManager.show({ title: 'Erro de Validação', message: `Adicione pelo menos uma bobina ao item ${itemNumber}.`, type: 'error' });
            formValido = false;
        }

        if (formValido) {
            itens.push({ 
                ID: itemId, 
                Tipo: tipoMaterial, 
                QtdLaminas: qtdLaminas, 
                Altura: altura, 
                Comprimento: comprimento, 
                Volumes: volumes, 
                Peso: pesoTotal, 
                SucataEsperada: sucataEsperada, 
                bobinasUsadas: bobinasUsadas 
            });
        }
    });

    if (!formValido) {
        return false;
    }

    // 2. Desabilitar o botão e mostrar feedback visual
    if (saveButton) {
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    }

    const producaoPayload = {
        ID: producaoId ? parseInt(producaoId) : null,
        NotaFiscal: notaFiscal,
        NumPedido: numPedido,
        NomeCliente: nomeCliente,
        DataProducao: dataProducao,
        Conferente: conferenteProducao,
        itens: itens
    };

    let url = 'https://virtualcriacoes.com/sinergy/api/producoes';
    let method = 'POST';

    if (producaoId) {
        url += `/${producaoId}`;
        method = 'PUT';
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(producaoPayload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Falha ao ${producaoId ? 'atualizar' : 'cadastrar'} a produção.`);
        }

        const result = await response.json();
        if (window.NotificationManager) {
            NotificationManager.show({ title: 'Sucesso!', message: result.message, type: 'success' });
        }

        await logProducaoMovimentacao(producaoId ? 'Atualização' : 'Criação', producaoPayload);

        await loadDatabases();
        window.closeAllModals();

    } catch (error) {
        console.error('Erro ao salvar produção:', error);
        if (window.NotificationManager) NotificationManager.show({ title: 'Erro', message: error.message, type: 'error' });

    } finally {
        // 3. Reabilitar o botão e restaurar o texto
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.innerHTML = 'Salvar'; // Restaura o texto original
        }
    }
}

/**
 * Confirma a exclusão de uma produção.
 * @param {number} id O ID da produção a ser excluída.
 * @param {string} notaFiscal A nota fiscal da produção para exibição no modal.
 */
function confirmarExclusao(id, notaFiscal) {
    deletingItemId = id;
    document.getElementById('nf-exclusao').textContent = notaFiscal;
    document.getElementById('modal-confirma-exclusao').style.display = 'block';
}

/**
 * Exclui uma produção após a confirmação.
 */
async function excluirProducao() {
    if (!deletingItemId) return;

    try {
        const response = await fetch(`https://virtualcriacoes.com/sinergy/api/producoes/${deletingItemId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha ao excluir a produção.');
        }

        const result = await response.json();
        if (window.NotificationManager) {
            NotificationManager.show({ title: 'Sucesso!', message: result.message, type: 'success' });
        }

        // Antes de recarregar, logue a movimentação de reversão
        // Recupere a produção original para logar os dados corretamente
        const producaoOriginal = producaoDatabase.find(p => p.ID === deletingItemId);
        if (producaoOriginal) {
            await logProducaoMovimentacao('Exclusão', producaoOriginal);
        }

        await loadDatabases(); // Recarrega os dados para atualizar a tabela
        window.closeAllModals(); // Fecha o modal de confirmação

    } catch (error) {
        console.error('Erro ao excluir produção:', error);
        if (window.NotificationManager) NotificationManager.show({ title: 'Erro', message: error.message, type: 'error' });
    } finally {
        deletingItemId = null;
    }
}

/**
 * Retorna as produções atualmente filtradas.
 * Útil para a navegação de página.
 */
function getFilteredProducoes() {
    const filterConferente = document.getElementById('filter-conferente').value;
    const filterMes = document.getElementById('filter-mes').value;
    const searchTerm = document.getElementById('search-produto').value.toLowerCase();

    return producaoDatabase.filter(producao => {
        // Filtrar por conferente
        if (filterConferente && producao.Conferente !== filterConferente) {
            return false;
        }

        // Filtrar por mês
        if (filterMes) {
            const producaoMonth = (producao.DataProducao.getMonth() + 1).toString().padStart(2, '0');
            if (producaoMonth !== filterMes) {
                return false;
            }
        }

        // Buscar por termo (Nota Fiscal ou Número do Pedido ou Nome do Cliente)
        if (searchTerm) {
            const notaFiscal = producao.NotaFiscal ? String(producao.NotaFiscal).toLowerCase() : '';
            const numPedido = producao.NumPedido ? String(producao.NumPedido).toLowerCase() : '';
            const nomeCliente = producao.NomeCliente ? String(producao.NomeCliente).toLowerCase() : '';

            if (!(notaFiscal.includes(searchTerm) || numPedido.includes(searchTerm) || nomeCliente.includes(searchTerm))) {
                return false;
            }
        }
        return true;
    });
}

/**
 * CORREÇÃO ESPECÍFICA - Função atualizarFator corrigida
 */
function atualizarFator(select, itemIndex) {
    
    const tipoMaterial = select.value;
    const fator = FATORES_MATERIAL[tipoMaterial];
    const alturaLaminaCm = ALTURAS_LAMINAS_CM[tipoMaterial];
    
    const fatorInfo = document.getElementById(`fator-info-${itemIndex}`);
    const alturaInput = document.getElementById(`altura-porta-${itemIndex}`);
    const qtdLaminasInput = document.getElementById(`qtd-laminas-${itemIndex}`);
    const pesoTotalInput = document.getElementById(`peso-total-${itemIndex}`);
    const sucataEsperadaInput = document.getElementById(`sucata-esperada-${itemIndex}`);

    // Verifica se os elementos existem
    if (!alturaInput || !qtdLaminasInput) {
        console.error(`[ERRO] Elementos não encontrados para item ${itemIndex}`);
        return;
    }

    // Atualiza o texto do fator
    if (fator && fatorInfo) {
        fatorInfo.textContent = `Fator: ${fator} kg por metro linear`;
    } else if (fatorInfo) {
        fatorInfo.textContent = '';
    }

    // Remove required de ambos os campos primeiro
    alturaInput.removeAttribute('required');
    qtdLaminasInput.removeAttribute('required');

    // Remove classes CSS de desabilitação
    alturaInput.closest('.form-group')?.classList.remove('is-disabled');
    qtdLaminasInput.closest('.form-group')?.classList.remove('is-disabled');

    // Lógica principal de habilitação/desabilitação
    if (alturaLaminaCm !== undefined) { 
        // É um tipo de lâmina (Meia-Cana, Meia-Cana Transvision, Super-Cana)
        
        alturaInput.disabled = false;
        alturaInput.setAttribute('required', 'required');
        alturaInput.placeholder = 'Ex: 5.425';
        alturaInput.closest('.form-group')?.classList.remove('is-disabled');
        
        qtdLaminasInput.disabled = true;
        qtdLaminasInput.value = '';
        qtdLaminasInput.placeholder = '(Calculado automaticamente)';
        qtdLaminasInput.closest('.form-group')?.classList.add('is-disabled');
        
    } else { 
        
        alturaInput.disabled = true;
        alturaInput.value = '';
        alturaInput.placeholder = 'Não aplicável';
        alturaInput.closest('.form-group')?.classList.add('is-disabled');
        
        qtdLaminasInput.disabled = false;
        qtdLaminasInput.setAttribute('required', 'required');
        qtdLaminasInput.value = '';
        qtdLaminasInput.placeholder = 'Digite a quantidade de lâminas';
        qtdLaminasInput.closest('.form-group')?.classList.remove('is-disabled');
    }

    // Limpa os campos calculados
    if (pesoTotalInput) pesoTotalInput.value = '';
    if (sucataEsperadaInput) sucataEsperadaInput.value = '';

    // Recalcula se possível
    calcularPesoLaminas(itemIndex);
    atualizarResumoItem(itemIndex);
}

/**
 * Atualiza os cartões de resumo. (Peso Total Produzido e Sucata Total Gerada).
 */
function updateSummary() {
    const totalPesoProduzido = producaoDatabase.reduce((sum, prod) => sum + calcularPesoTotalProducao(prod), 0);
    const totalSucataGerada = producaoDatabase.reduce((sum, prod) => sum + calcularSucataTotalProducao(prod), 0);

    document.getElementById('peso-total').textContent = `${totalPesoProduzido.toFixed(2)} kg`;
    document.getElementById('sucata-total').textContent = `${totalSucataGerada.toFixed(2)} kg`;
}

// Função de debug temporária para verificar os dados carregados
// function debugProducaoData() {
//     if (producaoDatabase.length > 0) {
//         producaoDatabase.forEach(prod => {
//             console.log(`Produção ID: ${prod.ID}, Pedido: ${prod.NumPedido}, Data: ${prod.DataProducao.toLocaleDateString()}`);
//             prod.itens.forEach(item => {
//                 console.log(`  - Item ID: ${item.ID}, Tipo: ${item.Tipo}, Altura: ${item.Altura}`);
//             });
//         });
//     } else {
//         console.log("Nenhuma produção carregada.");
//     }
//     console.log("--- Fim do Debug ---");
// }

/**
 * Exporta a tabela de produções para um arquivo CSV.
 */
function exportarProducoesToCSV() {
    let csvContent = [];
    
    // Obter o cabeçalho da tabela
    const headers = [
        "Data Produção", "Cliente", "Nº Pedido", "Itens", "Peso Total (kg)",
        "Sucata Total (kg)", "Conferentes", "Volumes Totais", "Nº Nota Fiscal"
    ];
    csvContent.push(headers.map(h => `"${h}"`).join(';'));
    
    // Obter as linhas de dados
    const producoesParaExportar = getFilteredProducoes(); // Usa a lista já filtrada
    producoesParaExportar.forEach(producao => {
        const pesoTotalProducao = calcularPesoTotalProducao(producao);
        const sucataTotalProducao = calcularSucataTotalProducao(producao);
        const volumesTotais = calcularVolumesTotaisProducao(producao);
        const conferentesUnicos = getConferentesUnicos(producao);
        const itensCount = producao.itens ? producao.itens.length : 0;

        const rowData = [
            `"${formatDate(producao.DataProducao)}"`,
            `"${producao.NomeCliente || 'N/A'}"`,
            `"${producao.NumPedido || 'N/A'}"`,
            `"${itensCount}"`,
            `"${pesoTotalProducao.toFixed(2).replace('.', ',')}"`,
            `"${sucataTotalProducao.toFixed(2).replace('.', ',')}"`,
            `"${conferentesUnicos.join(', ') || 'N/A'}"`,
            `"${volumesTotais}"`,
            `"${producao.NotaFiscal || 'N/A'}"`,
        ];
        csvContent.push(rowData.join(';'));
    });
    
    const csvString = csvContent.join('\n');
    const bom = '\ufeff';
    const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(bom + csvString);
    
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "producoes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (window.NotificationManager) {
        NotificationManager.show({
            title: 'Sucesso',
            message: 'Relatório de produções exportado com sucesso!',
            type: 'success'
        });
    }
}

// ===== INICIALIZAÇÃO (BLOCO FINAL) =====
document.addEventListener('DOMContentLoaded', function() {
    loadDatabases();
    setupEventListeners();
});