/**
 * tesouraria.js - Gestão de Fluxo de Caixa Unificado
 * ATUALIZADO: Ícones Padronizados e Edição de Lançamentos
 */

document.addEventListener('DOMContentLoaded', () => {
    initializeAppTesouraria();
});

const API_URL = 'https://virtualcriacoes.com/api';
let transacoes = []; // Array unificado (Entradas + Saídas)
let filteredTransacoes = [];

async function initializeAppTesouraria() {
    const userId = window.getLoggedInUserID();
    if (!userId) return;

    setupEventListeners();
    await loadTransacoes();

    const loader = document.getElementById('loader-overlay');
    if (loader) loader.style.display = 'none';
}

// === CARREGAMENTO E UNIFICAÇÃO DE DADOS ===
async function loadTransacoes() {
    try {
        const [resPagar, resReceber] = await Promise.all([
            fetch(`${API_URL}/contasapagar`),
            fetch(`${API_URL}/contasareceber`)
        ]);

        const contasPagar = await resPagar.json();
        const contasReceber = await resReceber.json();

        transacoes = [];

        // 1. Saídas (Pagar)
        contasPagar.forEach(conta => {
            if (conta.Status === 'Pago') {
                transacoes.push({
                    id: conta.ID,
                    tipo: 'saida',
                    data: conta.DataPagamento || conta.DataVencimento,
                    descricao: conta.Descricao,
                    entidade: conta.Fornecedor || 'Fornecedor Diverso',
                    categoria: conta.Categoria || 'Despesa',
                    valor: parseFloat(conta.Valor),
                    originalData: conta 
                });
            }
        });

        // 2. Entradas (Receber)
        contasReceber.forEach(conta => {
            if (conta.Status === 'Pago') {
                transacoes.push({
                    id: conta.ID,
                    tipo: 'entrada',
                    data: conta.DataRecebimento || conta.DataVencimento,
                    descricao: conta.ClienteNome, // Nome principal
                    entidade: `Pedido #${conta.NumeroPedido || 'N/A'}`,
                    categoria: 'Vendas',
                    valor: parseFloat(conta.Valor),
                    originalData: conta
                });
            }
        });

        // Ordena por data (mais recente primeiro)
        transacoes.sort((a, b) => new Date(b.data) - new Date(a.data));
        aplicarFiltros();

    } catch (error) {
        showNotification(`Erro ao carregar dados: ${error.message}`, 'error');
    }
}

function setupEventListeners() {
    // Filtros
    document.getElementById('search-input').addEventListener('input', aplicarFiltros);
    document.getElementById('filter-periodo').addEventListener('change', aplicarFiltros);
    document.getElementById('filter-tipo').addEventListener('change', aplicarFiltros);
    
    // Modal Reversão
    document.getElementById('close-reversao').addEventListener('click', fecharModalReversao);
    document.getElementById('btn-cancelar-reversao').addEventListener('click', fecharModalReversao);
    document.getElementById('form-reversao').addEventListener('submit', confirmarReversao);

    // Modal Edição (NOVO)
    document.getElementById('close-editar-tesouraria').addEventListener('click', fecharModalEdicao);
    document.getElementById('btn-cancelar-editar').addEventListener('click', fecharModalEdicao);
    document.getElementById('form-editar-tesouraria').addEventListener('submit', salvarEdicaoTransacao);

    // Exportar
    document.getElementById('btn-exportar-extrato').addEventListener('click', exportarExtratoExcel);
}

function aplicarFiltros() {
    const termo = document.getElementById('search-input').value.toLowerCase();
    const periodo = document.getElementById('filter-periodo').value;
    const tipoFiltro = document.getElementById('filter-tipo').value;

    const hoje = new Date();
    let dataLimite = null;

    if (periodo === 'hoje') {
        dataLimite = new Date();
        dataLimite.setHours(0,0,0,0);
    } else if (periodo !== 'todos') {
        dataLimite = new Date();
        dataLimite.setDate(hoje.getDate() - parseInt(periodo));
        dataLimite.setHours(0,0,0,0);
    }

    filteredTransacoes = transacoes.filter(t => {
        const matchTexto = t.descricao.toLowerCase().includes(termo) || t.entidade.toLowerCase().includes(termo);
        const matchTipo = (tipoFiltro === 'todos') || (t.tipo === tipoFiltro);
        let matchData = true;
        if (dataLimite) {
            const dataTransacao = new Date(t.data + 'T00:00:00');
            matchData = dataTransacao >= dataLimite;
        }
        return matchTexto && matchTipo && matchData;
    });

    renderizarTabela();
    atualizarKPIs();
}

function renderizarTabela() {
    const tbody = document.getElementById('tesouraria-tbody');
    tbody.innerHTML = '';

    if (filteredTransacoes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhuma movimentação encontrada.</td></tr>';
        return;
    }

    filteredTransacoes.forEach(t => {
        const tr = document.createElement('tr');
        
        // Badges
        const tipoBadge = t.tipo === 'entrada' 
            ? `<span class="badge-tipo entrada"><i class="fas fa-arrow-up"></i> Entrada</span>` 
            : `<span class="badge-tipo saida"><i class="fas fa-arrow-down"></i> Saída</span>`;
        
        const valorClass = t.tipo === 'entrada' ? 'text-success' : 'text-danger';
        const sinal = t.tipo === 'entrada' ? '+' : '-';

        tr.innerHTML = `
            <td>${formatarData(t.data)}</td>
            <td>${tipoBadge}</td>
            <td>
                <div style="font-weight:600; color:#334155;">${t.descricao}</div>
                <div style="font-size:12px; color:#64748b;">${t.entidade}</div>
            </td>
            <td>${t.categoria}</td>
            <td class="text-right ${valorClass}" style="font-weight:bold;">
                ${sinal} ${formatarMoeda(t.valor)}
            </td>
            <td class="text-center">
                <div class="table-actions">
                    <button class="action-button edit" onclick="abrirModalEdicao(${t.id}, '${t.tipo}')" title="Editar Lançamento">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-button revert" onclick="abrirModalReversao(${t.id}, '${t.tipo}')" title="Estornar Lançamento">
                        <i class="fas fa-undo-alt"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function atualizarKPIs() {
    let totalEntradas = 0;
    let totalSaidas = 0;
    filteredTransacoes.forEach(t => {
        if (t.tipo === 'entrada') totalEntradas += t.valor;
        else totalSaidas += t.valor;
    });
    const saldo = totalEntradas - totalSaidas;
    document.getElementById('kpi-entradas').textContent = formatarMoeda(totalEntradas);
    document.getElementById('kpi-saidas').textContent = formatarMoeda(totalSaidas);
    const elSaldo = document.getElementById('kpi-saldo');
    elSaldo.textContent = formatarMoeda(saldo);
    elSaldo.className = 'stat-value ' + (saldo >= 0 ? 'text-success' : 'text-danger');
}

// === EDIÇÃO (NOVO) ===
function abrirModalEdicao(id, tipo) {
    const transacao = transacoes.find(t => t.id === id && t.tipo === tipo);
    if (!transacao) return;

    document.getElementById('edit-id').value = id;
    document.getElementById('edit-tipo').value = tipo;
    
    document.getElementById('edit-descricao').value = transacao.descricao;
    document.getElementById('edit-categoria').value = transacao.categoria;
    document.getElementById('edit-valor').value = transacao.valor.toFixed(2);
    document.getElementById('edit-data').value = transacao.data;

    // Bloqueia categoria se for entrada (pois geralmente vem de Pedido)
    document.getElementById('edit-categoria').readOnly = (tipo === 'entrada');

    document.getElementById('modal-editar-tesouraria').classList.add('active');
}

function fecharModalEdicao() {
    document.getElementById('modal-editar-tesouraria').classList.remove('active');
}

async function salvarEdicaoTransacao(e) {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const tipo = document.getElementById('edit-tipo').value;
    const descricao = document.getElementById('edit-descricao').value;
    const categoria = document.getElementById('edit-categoria').value;
    const valor = parseFloat(document.getElementById('edit-valor').value);
    const dataMov = document.getElementById('edit-data').value;

    // Recupera os dados originais para não perder informações que não estamos editando aqui
    const original = transacoes.find(t => t.id == id && t.tipo == tipo).originalData;

    let url, payload;

    // Monta o payload baseado no tipo (precisa corresponder ao que o backend espera)
    if (tipo === 'entrada') {
        url = `${API_URL}/contasareceber/${id}`;
        payload = {
            ClienteNome: descricao, // Na entrada, a descrição é o nome do cliente
            Valor: valor,
            DataRecebimento: dataMov,
            // Mantém os originais
            NumeroPedido: original.NumeroPedido,
            DataVencimento: original.DataVencimento,
            Status: 'Pago', // Mantém pago
            TipoPagamento: original.TipoPagamento,
            FormaPagamento: original.FormaPagamento
        };
    } else {
        url = `${API_URL}/contasapagar/${id}`;
        payload = {
            Descricao: descricao,
            Categoria: categoria,
            Valor: valor,
            DataPagamento: dataMov,
            // Mantém originais
            Fornecedor: original.Fornecedor,
            DataVencimento: original.DataVencimento,
            Status: 'Pago',
            Observacoes: original.Observacoes,
            TipoPagamento: original.TipoPagamento,
            FormaPagamento: original.FormaPagamento
        };
    }

    try {
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showNotification('Lançamento atualizado com sucesso!', 'success');
            fecharModalEdicao();
            loadTransacoes(); // Recarrega a lista atualizada
        } else {
            throw new Error('Erro ao atualizar.');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// === REVERSÃO ===
function abrirModalReversao(id, tipo) {
    const transacao = transacoes.find(t => t.id === id && t.tipo === tipo);
    if (!transacao) return;
    document.getElementById('reversao-id').value = id;
    document.getElementById('reversao-tipo').value = tipo;
    document.getElementById('reversao-descricao').textContent = transacao.descricao;
    document.getElementById('reversao-valor').textContent = formatarMoeda(transacao.valor);
    document.getElementById('reversao-motivo').value = '';
    document.getElementById('modal-reversao').classList.add('active');
}
function fecharModalReversao() { document.getElementById('modal-reversao').classList.remove('active'); }

async function confirmarReversao(e) {
    e.preventDefault();
    const id = document.getElementById('reversao-id').value;
    const tipo = document.getElementById('reversao-tipo').value;
    const motivo = document.getElementById('reversao-motivo').value.trim();
    const btn = document.getElementById('btn-confirmar-reversao');

    if (!motivo) { showNotification('Informe o motivo do estorno.', 'warning'); return; }
    btn.disabled = true; btn.innerHTML = 'Processando...';

    try {
        let url, payload;
        if (tipo === 'entrada') {
            url = `${API_URL}/contasareceber/${id}`;
            payload = { marcarComoAguardando: true }; 
        } else {
            url = `${API_URL}/contasapagar/${id}`;
            payload = { marcarComoPendente: true };
        }

        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Falha ao estornar.');

        showNotification('Lançamento estornado com sucesso!', 'success');
        fecharModalReversao();
        loadTransacoes();
    } catch (error) { showNotification(error.message, 'error'); }
    finally { btn.disabled = false; btn.innerHTML = 'Confirmar Estorno'; }
}

function exportarExtratoExcel() {
    let csv = []; csv.push("Data;Tipo;Descrição;Entidade;Categoria;Valor;Status");
    filteredTransacoes.forEach(t => {
        const val = t.valor.toFixed(2).replace('.', ',');
        csv.push(`${formatarData(t.data)};${t.tipo.toUpperCase()};${t.descricao};${t.entidade};${t.categoria};${val};Liquidado`);
    });
    const blob = new Blob(["\ufeff", csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "extrato_tesouraria.csv";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

// Utils
function formatarMoeda(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function formatarData(d) { if(!d) return '-'; return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR'); }
function showNotification(msg, type) { if(window.NotificationManager) window.NotificationManager.show({ title: type, message: msg, type: type }); else alert(msg); }