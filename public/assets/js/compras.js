/**
 * js/compras.js - Gestão de Solicitações e Compras
 */

document.addEventListener('DOMContentLoaded', () => {
    initializeAppCompras();
});

const API_URL = 'https://virtualcriacoes.com/sinergy/api';
let allSolicitacoes = [];
let currentUserID = null;
let currentUserRole = null;
let currentAprovacaoId = null;

async function initializeAppCompras() {
    currentUserID = window.getLoggedInUserID();
    currentUserRole = window.getLoggedInUserRole();
    
    if (!currentUserID) return;

    setupEventListeners();
    await loadSolicitacoes();
    
    // CORREÇÃO: Verifica se o elemento ainda existe antes de tentar escondê-lo
    const loader = document.getElementById('loader-overlay');
    if (loader) {
        loader.style.display = 'none';
    }
}

async function loadSolicitacoes() {
    try {
        const res = await fetch(`${API_URL}/solicitacoes-compras?usuarioID=${currentUserID}&role=${currentUserRole}`);
        if (!res.ok) throw new Error('Erro ao carregar');
        allSolicitacoes = await res.json();
        renderCards(allSolicitacoes);
    } catch (e) {
        showNotification(e.message, 'error');
    }
}

function setupEventListeners() {
    // Filtros
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            aplicarFiltros();
        });
    });
    
    document.getElementById('search-input').addEventListener('input', aplicarFiltros);
    document.getElementById('filter-setor').addEventListener('change', aplicarFiltros);

    // Modal Nova Solicitação
    document.getElementById('btn-nova-solicitacao').addEventListener('click', () => {
        document.getElementById('form-solicitacao').reset();
        document.getElementById('modal-solicitacao').classList.add('active');
    });
    
    document.getElementById('close-modal').addEventListener('click', () => document.getElementById('modal-solicitacao').classList.remove('active'));
    document.getElementById('btn-cancelar').addEventListener('click', () => document.getElementById('modal-solicitacao').classList.remove('active'));
    
    document.getElementById('form-solicitacao').addEventListener('submit', salvarSolicitacao);

    // Modal Aprovação
    document.getElementById('close-aprovacao').addEventListener('click', () => document.getElementById('modal-aprovacao').classList.remove('active'));
    document.getElementById('btn-cancelar-aprovacao').addEventListener('click', () => document.getElementById('modal-aprovacao').classList.remove('active'));
    document.getElementById('form-aprovacao').addEventListener('submit', confirmarAprovacao);
}

function aplicarFiltros() {
    const termo = document.getElementById('search-input').value.toLowerCase();
    const setor = document.getElementById('filter-setor').value;
    const statusFilter = document.querySelector('.filter-chip.active').dataset.filter;

    const filtrados = allSolicitacoes.filter(s => {
        const matchTexto = s.Material.toLowerCase().includes(termo) || s.Descricao.toLowerCase().includes(termo);
        const matchSetor = !setor || s.Setor === setor;
        const matchStatus = statusFilter === 'todos' ? true : 
                            statusFilter === 'Urgente' ? s.Prioridade === 'Urgente' || s.Prioridade === 'Crítica' :
                            s.Status === statusFilter;
        
        return matchTexto && matchSetor && matchStatus;
    });

    renderCards(filtrados);
}

function renderCards(lista) {
    const container = document.getElementById('requests-container');
    container.innerHTML = '';

    if (lista.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 40px;">Nenhuma solicitação encontrada.</div>';
        return;
    }

    // 1. Normaliza o papel do usuário (tudo minúsculo para comparar)
    const userRole = (currentUserRole || '').toLowerCase().trim();

    lista.forEach(req => {
        const card = document.createElement('div');
        card.className = `request-card priority-${req.Prioridade}`;
        
        // 3. Normaliza o status para comparação
        const statusRaw = (req.Status || '').toLowerCase().trim();

        let actionsHtml = '';
        
        // 4. Lógica de Permissão Flexível
        // Aceita: admin, administrador, master, ti, compras, etc. (adicione os seus)
        const isAdmin = ['admin', 'administrador', 'master', 'ti', 'compras'].includes(userRole);
        
        // Aceita: pendente, solicitado, em análise
        const isPendente = ['pendente', 'solicitado', 'em análise'].includes(statusRaw);
        
        if (isAdmin && isPendente) {
            actionsHtml = `
                <div class="req-actions">
                    <button class="btn-approve" onclick="abrirModalAprovacao(${req.ID})" title="Aprovar e Comprar" style="border:none; background:none; cursor:pointer; font-size:18px; color:#27ae60; margin-right:10px;">
                        <i class="fas fa-check-circle"></i>
                    </button>
                    <button class="btn-reject" onclick="rejeitarSolicitacao(${req.ID})" title="Recusar" style="border:none; background:none; cursor:pointer; font-size:18px; color:#e74c3c;">
                        <i class="fas fa-times-circle"></i>
                    </button>
                </div>
            `;
        } else {
            // Se não for admin OU não estiver pendente, mostra o badge
            const statusClass = statusRaw.replace(/ /g, '-').replace(/[^\w-]/g, ''); // Remove acentos para classe CSS
            actionsHtml = `<span class="status-pill ${statusClass}">${req.Status}</span>`;
        }

        // Iniciais do solicitante
        const solicitanteNome = req.Solicitante || 'Desconhecido';
        const initials = solicitanteNome.substring(0, 2).toUpperCase();

        card.innerHTML = `
            <div class="req-header">
                <span class="req-setor">${req.Setor}</span>
                <span class="req-date">${formatarData(req.DataSolicitacao)}</span>
            </div>
            <div class="req-title">${req.Material}</div>
            <div class="req-desc">${req.Descricao || 'Sem descrição.'}</div>
            
            <div class="req-meta">
                <span><i class="fas fa-box"></i> ${req.Quantidade} ${req.Unidade}</span>
                <span><i class="fas fa-exclamation-circle"></i> ${req.Prioridade}</span>
            </div>
            
            ${req.DataNecessidade ? `<div style="font-size: 11px; color: #e74c3c; margin-bottom: 10px;">Precisa para: ${formatarData(req.DataNecessidade)}</div>` : ''}

            <div class="req-footer">
                <div class="req-user">
                    <div class="user-avatar-mini" title="${solicitanteNome}" style="width:24px; height:24px; border-radius:50%; background:#cbd5e1; display:flex; align-items:center; justify-content:center; color:white; font-size:10px;">${initials}</div>
                    <span style="margin-left: 5px;">${solicitanteNome.split(' ')[0]}</span>
                </div>
                ${actionsHtml}
            </div>
        `;
        container.appendChild(card);
    });
}

async function salvarSolicitacao(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;

    const data = {
        UsuarioID: currentUserID,
        Material: document.getElementById('input-material').value,
        Quantidade: document.getElementById('input-qtd').value,
        Unidade: document.getElementById('input-unidade').value,
        Setor: document.getElementById('input-setor').value,
        Prioridade: document.getElementById('input-prioridade').value,
        DataNecessidade: document.getElementById('input-data-necessidade').value,
        Descricao: document.getElementById('input-descricao').value
    };

    try {
        const res = await fetch(`${API_URL}/solicitacoes-compras`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            showNotification('Solicitação enviada!', 'success');
            document.getElementById('modal-solicitacao').classList.remove('active');
            loadSolicitacoes();
        } else {
            throw new Error('Erro ao salvar');
        }
    } catch (err) {
        showNotification(err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

// === FLUXO DE APROVAÇÃO ===

window.abrirModalAprovacao = function(id) {
    const req = allSolicitacoes.find(s => s.ID === id);
    if (!req) return;

    currentAprovacaoId = id;
    document.getElementById('aprovacao-item').textContent = `${req.Quantidade}${req.Unidade} - ${req.Material}`;
    document.getElementById('aprovacao-solicitante').textContent = req.Solicitante;
    document.getElementById('aprov-vencimento').valueAsDate = new Date(); // Hoje
    
    document.getElementById('modal-aprovacao').classList.add('active');
};

async function confirmarAprovacao(e) {
    e.preventDefault();
    
    const payload = {
        Status: 'Aprovado',
        Fornecedor: document.getElementById('aprov-fornecedor').value,
        ValorFinal: document.getElementById('aprov-valor').value,
        FormaPagamento: document.getElementById('aprov-forma-pgto').value,
        TipoPagamento: 'À Vista', // Poderia ser campo também
        DataVencimento: document.getElementById('aprov-vencimento').value,
        GerarFinanceiro: document.getElementById('aprov-gerar-financeiro').checked,
        DescricaoFinanceira: `Compra de ${document.getElementById('aprovacao-item').textContent}`,
        UsuarioID: currentUserID // Quem aprovou
    };

    try {
        const res = await fetch(`${API_URL}/solicitacoes-compras/${currentAprovacaoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showNotification('Compra aprovada e lançada no financeiro!', 'success');
            document.getElementById('modal-aprovacao').classList.remove('active');
            loadSolicitacoes();
        } else {
            throw new Error('Erro ao aprovar');
        }
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

window.rejeitarSolicitacao = async function(id) {
    const motivo = prompt("Motivo da recusa:");
    if (!motivo) return;

    try {
        const res = await fetch(`${API_URL}/solicitacoes-compras/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Status: 'Recusado', MotivoRecusa: motivo })
        });
        if (res.ok) {
            showNotification('Solicitação recusada.', 'info');
            loadSolicitacoes();
        }
    } catch (err) {
        showNotification('Erro ao recusar', 'error');
    }
};

// Utils
function formatarData(d) { if(!d) return ''; return new Date(d).toLocaleDateString('pt-BR'); }
function showNotification(msg, type) { if(window.NotificationManager) window.NotificationManager.show({ title: type, message: msg, type: type }); else alert(msg); }
function getLoggedInUserID() { return localStorage.getItem('sinergy_user_id') || sessionStorage.getItem('sinergy_user_id'); }
function getLoggedInUserRole() { return localStorage.getItem('sinergy_user_role') || sessionStorage.getItem('sinergy_user_role'); }