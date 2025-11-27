/**
 * saldo.js - Funcionalidades para a página de saldo de estoque (Integrado ao Backend)
 */

document.addEventListener('DOMContentLoaded', function() {
    initPage();
    setupEventListeners();
    loadSaldoData();
});

let bobinaDatabase = [];
let summarizedData = {};

const PRODUTO_CODIGOS = {
    'Meia-Cana 125mm': 19844,
    'Meia-Cana 136mm': 11699,
    'Meia-Cana Transvision': 11682,
    'Super-Cana': 19839,
    'Guia 50': 11647,
    'Guia 60': 11653,
    'Guia 70': 11660,
    'Guia 100': 11676,
    'Soleira': 11631,
    'Eixo': 11624
};

const ALL_MATERIAL_TYPES = [
    'Meia-Cana',
    'Meia-Cana Transvision',
    'Super-Cana',
    'Guia 50',
    'Guia 60',
    'Guia 70',
    'Guia 100',
    'Soleira',
    'Eixo',
];

const limitesEstoque = {    
    'Meia-Cana 125mm': { baixo: 4999, regular: 6999 },
    'Meia-Cana 136mm': { baixo: 2999, regular: 3999 },
    'Meia-Cana Transvision': { baixo: 2500, regular: 5000 },
    'Super-Cana': { baixo: 2500, regular: 4000 },
    'Guia 50': { baixo: 1000, regular: 1500 },
    'Guia 60': { baixo: 1000, regular: 1500 },
    'Guia 70': { baixo: 1500, regular: 2000 },
    'Guia 100': { baixo: 1000, regular: 1500 },
    'Soleira': { baixo: 1000, regular: 1500 },
    'Eixo': { baixo: 1500, regular: 2500 },
};

function initPage() {
}

function setupEventListeners() {
    document.getElementById('filter-saldo-tipo').addEventListener('change', applyFilters);
    document.getElementById('filter-saldo-status').addEventListener('change', applyFilters);
    document.getElementById('search-saldo').addEventListener('input', applyFilters);
    document.getElementById('export-excel-btn').addEventListener('click', exportTableToCSV);
}

async function loadSaldoData() {
    try {
        const response = await fetch('https://virtualcriacoes.com/api/bobinas');
        if (!response.ok) {
            throw new Error('Falha ao carregar saldo de bobinas.');
        }
        bobinaDatabase = await response.json();
        
        bobinaDatabase.forEach(bob => {
            bob.Peso = parseFloat(bob.Peso);
        });

        summarizeBobinasByType();
        applyFilters();
        updateSummaryCards();
    } catch (error) {
        console.error('Erro ao carregar dados de saldo:', error);
        showMessage('Falha ao carregar saldo de estoque. Verifique a conexão.', 'error');
    }
}

function summarizeBobinasByType() {
    summarizedData = {};
    const allExpectedTypes = [
        ...Object.keys(limitesEstoque).filter(k => !k.startsWith('Total')),
        ...ALL_MATERIAL_TYPES.filter(t => !Object.keys(limitesEstoque).includes(t))
    ];
    allExpectedTypes.forEach(type => {
        summarizedData[type] = {
            totalWeight: 0,
            status: 'Indisponível',
            countAvailable: 0,
            countUnavailable: 0
        };
    });
    bobinaDatabase.forEach(bobina => {
        let tipo = bobina.Tipo;
        const peso = Number(bobina.Peso);
        const status = bobina.Status;
        
        if (tipo === 'Meia-Cana') {
            tipo += ` ${bobina.Largura}mm`;
        }
        if (!summarizedData[tipo]) {
             summarizedData[tipo] = {
                totalWeight: 0,
                status: 'Indisponível',
                countAvailable: 0,
                countUnavailable: 0
            };
        }
        summarizedData[tipo].totalWeight += peso;
        if (status === 'Disponível') {
            summarizedData[tipo].countAvailable++;
        } else {
            summarizedData[tipo].countUnavailable++;
        }
    });
    if (summarizedData['Meia-Cana 125mm'] || summarizedData['Meia-Cana 136mm']) {
        delete summarizedData['Meia-Cana'];
    }
    const totalMeiaCanaPeso = (summarizedData['Meia-Cana 125mm']?.totalWeight || 0) + (summarizedData['Meia-Cana 136mm']?.totalWeight || 0);
    const totalMeiaCanaStatus = totalMeiaCanaPeso > 0 ? 'Disponível' : 'Indisponível';
    summarizedData['Total Meia-Cana'] = {
        totalWeight: totalMeiaCanaPeso,
        status: totalMeiaCanaStatus,
    };
    Object.keys(summarizedData).forEach(tipo => {
        const data = summarizedData[tipo];
        if (data.totalWeight > 0) {
            data.status = 'Disponível';
        } else {
            data.status = 'Indisponível';
        }
    });
}

function applyFilters() {
    const tipoFilter = document.getElementById('filter-saldo-tipo').value;
    const statusFilter = document.getElementById('filter-saldo-status').value;
    const searchTerm = document.getElementById('search-saldo').value.toLowerCase();
    const filteredTypes = Object.keys(summarizedData).filter(tipo => {
        const data = summarizedData[tipo];
        if (tipoFilter === 'Meia-Cana') {
            if (!tipo.startsWith('Meia-Cana')) return false;
        } else if (tipoFilter && tipo !== tipoFilter) {
            if (tipo.startsWith('Meia-Cana')) return false;
            if (tipo.startsWith('Total Meia-Cana')) return false;
            if (tipo !== tipoFilter) return false;
        }
        if (statusFilter && data.status !== statusFilter) {
            return false;
        }
        if (searchTerm && !tipo.toLowerCase().includes(searchTerm)) {
            return false;
        }
        if (!tipoFilter && tipo.startsWith('Total')) return false;
        return true;
    });
    renderSaldoTable(filteredTypes);
}

function renderSaldoTable(filteredTypes) {
    const tableBody = document.querySelector('#tabela-saldo tbody');
    tableBody.innerHTML = '';
    if (filteredTypes.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 20px; color: #7f8c8d;">Nenhum tipo de material encontrado com os filtros aplicados.</td></tr>`;
        return;
    }
    const ordemDesejada = [
        'Super-Cana',
        'Meia-Cana 125mm',
        'Meia-Cana 136mm',
        'Meia-Cana Transvision',
        'Guia 50',
        'Guia 60',
        'Guia 70',
        'Guia 100',
        'Soleira',
        'Eixo'
    ];
    const orderMap = new Map();
    ordemDesejada.forEach((tipo, index) => orderMap.set(tipo, index));
    const itemsToRender = filteredTypes
        .filter(tipo => orderMap.has(tipo))
        .sort((a, b) => {
            return orderMap.get(a) - orderMap.get(b);
        });
    itemsToRender.forEach(tipo => {
        const data = summarizedData[tipo];
        let nivelEstoque = '';
        let nivelEstoqueClass = '';
        const peso = data.totalWeight;
        const limites = limitesEstoque[tipo];
        const estoqueMinimo = limites ? limites.baixo.toFixed(0) : 'N/D';
        const estoqueRegular = limites ? limites.regular.toFixed(0) : 'N/D';
        if (!limites) {
            nivelEstoque = 'Não Definido';
            nivelEstoqueClass = 'status-info';
        } else {
            if (peso === 0) {
                nivelEstoque = 'Vazio';
                nivelEstoqueClass = 'status-vazio';
            } else if (peso <= limites.baixo) {
                nivelEstoque = 'Baixo';
                nivelEstoqueClass = 'status-baixo';
            } else if (peso > limites.baixo && peso <= limites.regular) {
                nivelEstoque = 'Regular';
                nivelEstoqueClass = 'status-regular';
            } else {
                nivelEstoque = 'Saudável';
                nivelEstoqueClass = 'status-saudavel';
            }
        }
        const statusClass = data.status === 'Disponível' ? 'status-disponivel' : 'status-indisponivel';
        let tipoDisplay = tipo;
        let rowClass = '';
        if (tipo.startsWith('Total')) {
            tipoDisplay = `<strong>${tipo}</strong>`;
            rowClass = 'total-row';
        }
        const row = document.createElement('tr');
        row.className = rowClass;
        row.innerHTML = `
            <td>${tipoDisplay}</td>
            <td>${estoqueMinimo} kg</td>
            <td>${estoqueRegular} kg</td>
            <td>${peso.toFixed(2)} kg</td>
            <td><span class="status-badge ${nivelEstoqueClass}">${nivelEstoque}</span></td>
            <td><span class="status-badge ${statusClass}">${data.status}</span></td>
        `;
        tableBody.appendChild(row);
    });
}

function updateSummaryCards() {
    let totalPesoGeral = 0;
    let totalTipos = 0;
    Object.keys(summarizedData).forEach(tipo => {
        if (!tipo.startsWith('Total')) {
            const data = summarizedData[tipo];
            totalPesoGeral += data.totalWeight;
            if (data.totalWeight > 0) {
                totalTipos++;
            }
        }
    });
    document.getElementById('total-saldo-peso').textContent = `${totalPesoGeral.toFixed(2)} kg`;
    document.getElementById('total-saldo-tipos').textContent = totalTipos;
}

function exportTableToCSV() {
    let csvContent = [];
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    const newHeaders = ['Data', 'Classe', 'Cód. Produto', 'Produto', 'Quantidade', 'Unidade', 'Local Estocagem', 'Operação', 'Nº Pedido'];
    csvContent.push(newHeaders.join(';'));
    
    const ordemDesejada = [
        'Super-Cana',
        'Meia-Cana 125mm',
        'Meia-Cana 136mm',
        'Meia-Cana Transvision',
        'Guia 50',
        'Guia 60',
        'Guia 70',
        'Guia 100',
        'Soleira',
        'Eixo'
    ];
    const sortedTypes = Object.keys(summarizedData)
        .filter(tipo => ordemDesejada.includes(tipo))
        .sort((a, b) => ordemDesejada.indexOf(a) - ordemDesejada.indexOf(b));

    sortedTypes.forEach(tipo => {
        const data = summarizedData[tipo];
        const peso = data.totalWeight;
        const pesoFormatado = peso.toFixed(2).replace('.', ',');
        
        const codProduto = PRODUTO_CODIGOS[tipo] || '';
        const classeProduto = 'Laminas'; // Valor fixo
        const localEstocagem = 'GALPÃO JOÃO MAFRA'; // Valor fixo
        const operacao = 'Saída'; // Valor fixo

        const rowData = [
            `"${formattedDate}"`,
            `"${classeProduto}"`,
            `"${codProduto}"`,
            `"${tipo}"`,
            `${pesoFormatado}`,
            'KG',
            `"${localEstocagem}"`,
            `"${operacao}"`,
            '""'
        ];
        csvContent.push(rowData.join(';'));
    });
    
    const csvString = csvContent.join('\n');
    const bom = '\ufeff';
    const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(bom + csvString);
    
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "saldo_estoque_formatado.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function showMessage(message, type = 'info') {
    if (window.NotificationManager) {
        NotificationManager.show({
            title: type.charAt(0).toUpperCase() + type.slice(1),
            message: message,
            type: type
        });
    } else {
        console.warn('NotificationManager não disponível. Mensagem:', message, 'Tipo:', type);
        alert(`${type.toUpperCase()}: ${message}`);
    }
}