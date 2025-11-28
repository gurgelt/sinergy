document.addEventListener('DOMContentLoaded', () => {
    initializeAppFinanceiro();
});

// === CONSTANTES E VARIÁVEIS GLOBAIS ===
const API_URL = 'https://virtualcriacoes.com/sinergy/api';
let charts = {}; // Para armazenar instâncias dos gráficos

// === INICIALIZAÇÃO ===

async function initializeAppFinanceiro() {
    const loader = document.getElementById('loader-overlay');
    
    try {
        const response = await fetch(`${API_URL}/financeiro/dashboard`);
        if (!response.ok) {
            throw new Error('Falha ao carregar dados do dashboard');
        }
        const data = await response.json();
        
        populateKPIs(data.kpis);
        renderFluxoCaixaChart(data.charts.fluxoCaixa);
        renderDespesasChart(data.charts.despesasCategoria);
        populateQuickLists(data.listas);

    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        if (loader) loader.style.display = 'none';
    }
}

// === PREENCHIMENTO DOS DADOS ===

function populateKPIs(kpis) {
    document.getElementById('kpi-a-receber').textContent = formatarMoeda(kpis.aReceber);
    document.getElementById('kpi-a-pagar').textContent = formatarMoeda(kpis.aPagar);
    document.getElementById('kpi-saldo-previsto').textContent = formatarMoeda(kpis.saldoPrevisto);
    document.getElementById('kpi-recebido-30d').textContent = formatarMoeda(kpis.recebido30d);
    document.getElementById('kpi-pago-30d').textContent = formatarMoeda(kpis.pago30d);
    document.getElementById('kpi-vencido-receber').textContent = formatarMoeda(kpis.vencidoReceber);
    
    // Altera a cor do Saldo Previsto
    const saldoPrevistoEl = document.getElementById('kpi-saldo-previsto');
    if (kpis.saldoPrevisto < 0) {
        saldoPrevistoEl.style.color = '#e74c3c'; // Vermelho
    } else {
        saldoPrevistoEl.style.color = '#2ecc71'; // Verde
    }
}

function populateQuickLists(listas) {
    const pagamentosBody = document.getElementById('prox-pagamentos-tbody');
    pagamentosBody.innerHTML = '';
    if (listas.proximosPagamentos.length > 0) {
        listas.proximosPagamentos.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.Descricao}</td>
                <td>${formatarData(item.DataVencimento)}</td>
                <td class="text-right">${formatarMoeda(item.Valor)}</td>
            `;
            pagamentosBody.appendChild(tr);
        });
    } else {
        pagamentosBody.innerHTML = '<tr><td colspan="3" class="text-center">Nenhum pagamento pendente.</td></tr>';
    }

    const recebimentosBody = document.getElementById('prox-recebimentos-tbody');
    recebimentosBody.innerHTML = '';
    if (listas.proximosRecebimentos.length > 0) {
        listas.proximosRecebimentos.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.ClienteNome}</td>
                <td>${formatarData(item.DataVencimento)}</td>
                <td class="text-right">${formatarMoeda(item.Valor)}</td>
            `;
            recebimentosBody.appendChild(tr);
        });
    } else {
        recebimentosBody.innerHTML = '<tr><td colspan="3" class="text-center">Nenhum recebimento pendente.</td></tr>';
    }
}

// === RENDERIZAÇÃO DOS GRÁFICOS ===

function renderFluxoCaixaChart(data) {
    const ctx = document.getElementById('fluxo-caixa-chart').getContext('2d');
    
    if (charts.fluxoCaixa) {
        charts.fluxoCaixa.destroy();
    }
    
    charts.fluxoCaixa = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels, // ['01/11', '02/11', ...]
            datasets: [
                {
                    label: 'Entradas (Recebido)',
                    data: data.entradas, // [0, 500, ...]
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    fill: true,
                    tension: 0.1
                },
                {
                    label: 'Saídas (Pago)',
                    data: data.saidas, // [100, 0, ...]
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    fill: true,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => formatarMoeda(value)
                    }
                }
            }
        }
    });
}

function renderDespesasChart(data) {
    const ctx = document.getElementById('despesas-chart').getContext('2d');
    
    if (charts.despesas) {
        charts.despesas.destroy();
    }
    
    charts.despesas = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels, // ['Matéria-Prima', 'Impostos', ...]
            datasets: [{
                label: 'Despesas por Categoria',
                data: data.valores, // [1500, 300, ...]
                backgroundColor: [
                    '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#34495e', '#1abc9c'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
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