/**
 * js/notifications.js - Sistema de Notificação Global, Avisos e Monitoramento
 * Versão Completa - Sem Omissões
 */

// === MAPA DE TRADUÇÃO DE TÍTULOS ===
const NotificationTitles = {
    'success': 'Sucesso',
    'Success': 'Sucesso',
    'error': 'Erro',
    'Error': 'Erro',
    'warning': 'Atenção',
    'Warning': 'Atenção',
    'info': 'Informação',
    'Info': 'Informação'
};

const SecurityUtils = {
    sanitizeHTML(str) {
        if (typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
    isLibraryAvailable(library) {
        return true; 
    }
};

const NotificationConfig = {
    DEFAULT_DURATION: 5000,
    CONTAINER_ID: 'notification-container',
    ANIMATION_DELAY: 10,
    HIDE_ANIMATION_DURATION: 500,
    ICONS: {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    },
    FALLBACK_ICONS: {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    }
};

const NotificationManager = {
    container: null,
    isInitialized: false,
    activeNotifications: new Map(), 
    systemWarnings: [], 

    init() {
        if (this.isInitialized) return true;

        // === VERIFICAÇÃO DE SEGURANÇA ===
        // Não inicializa lógica pesada na tela de login
        const isLoginPage = window.location.pathname.includes('login.html') || window.location.pathname.includes('reset-password.html');
        
        this.container = this.createOrGetContainer();
        this.isInitialized = true;

        // Se não for login, carrega tudo
        this.setupBellIcon();
        this.injectConfigModal();
        this.checkSystemWarnings();
        
        return true;
    },

    createOrGetContainer() {
        let container = document.getElementById(NotificationConfig.CONTAINER_ID);
        if (!container) {
            container = document.createElement('div');
            container.id = NotificationConfig.CONTAINER_ID;
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-label', 'Notificações do sistema');
            document.body.appendChild(container);
        }
        return container;
    },

    // Injeta o Modal de Configuração de Avisos (Apenas visível para Admin via lógica de botão)
    injectConfigModal() {
        if (document.getElementById('modal-config-notificacoes')) return;

        const modalHTML = `
        <div id="modal-config-notificacoes" class="modal" style="z-index: 10000;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2><i class="fas fa-bullhorn"></i> Novo Aviso do Sistema</h2>
                    <button class="close-modal" onclick="NotificationManager.closeConfigModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 15px; color: #64748b; font-size: 14px;">
                        Este aviso aparecerá para <strong>todos os usuários</strong> do sistema no topo das notificações.
                    </p>
                    <form id="form-aviso-sistema">
                        <div class="form-group">
                            <label>Título</label>
                            <input type="text" id="aviso-titulo" class="form-control" required placeholder="Ex: Manutenção Programada">
                        </div>
                        <div class="form-group">
                            <label>Mensagem</label>
                            <textarea id="aviso-mensagem" class="form-control" rows="3" required placeholder="Ex: O sistema ficará indisponível hoje às 18h..."></textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Tipo</label>
                                <select id="aviso-tipo" class="form-control">
                                    <option value="info">Informação (Azul)</option>
                                    <option value="warning">Atenção (Amarelo)</option>
                                    <option value="error">Crítico (Vermelho)</option>
                                    <option value="success">Sucesso (Verde)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Expira em (Opcional)</label>
                                <input type="datetime-local" id="aviso-expiracao" class="form-control">
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="NotificationManager.closeConfigModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Publicar Aviso</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Adiciona o listener para o formulário recém-criado
        const form = document.getElementById('form-aviso-sistema');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSystemWarning();
            });
        }
    },

    openConfigModal() {
        const modal = document.getElementById('modal-config-notificacoes');
        if (modal) modal.classList.add('active');
    },

    closeConfigModal() {
        const modal = document.getElementById('modal-config-notificacoes');
        if (modal) {
            modal.classList.remove('active');
            document.getElementById('form-aviso-sistema').reset();
        }
    },

    async saveSystemWarning() {
        const titulo = document.getElementById('aviso-titulo').value;
        const mensagem = document.getElementById('aviso-mensagem').value;
        const tipo = document.getElementById('aviso-tipo').value;
        const expiracao = document.getElementById('aviso-expiracao').value;
        const userId = localStorage.getItem('sinergy_user_id') || sessionStorage.getItem('sinergy_user_id');

        try {
            const res = await fetch('https://virtualcriacoes.com/sinergy/api/avisos-sistema', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    titulo, mensagem, tipo, expiracao, usuario_id: userId
                })
            });

            if (res.ok) {
                this.show({ title: 'Sucesso', message: 'Aviso publicado com sucesso!', type: 'success' });
                this.closeConfigModal();
                this.checkSystemWarnings(); // Recarrega a lista
            } else {
                throw new Error('Erro ao salvar aviso.');
            }
        } catch (e) {
            this.show({ title: 'Erro', message: e.message, type: 'error' });
        }
    },

    async checkSystemWarnings() {
        try {
            const res = await fetch('https://virtualcriacoes.com/sinergy/api/avisos-sistema');
            if (res.ok) {
                this.systemWarnings = await res.json();
                this.updateDropdown();
            }
        } catch (e) {
            console.error("Erro ao buscar avisos do sistema", e);
        }
    },

    async deleteSystemWarning(id) {
        if(!confirm("Deseja remover este aviso para todos os usuários?")) return;
        
        try {
            await fetch(`https://virtualcriacoes.com/sinergy/api/avisos-sistema/${id}`, { method: 'DELETE' });
            this.checkSystemWarnings(); // Recarrega a lista
        } catch (e) { 
            console.error(e); 
            this.show({ title: 'Erro', message: 'Falha ao excluir aviso.', type: 'error' });
        }
    },

    show({ title, message, type = 'info', duration = NotificationConfig.DEFAULT_DURATION, id = null }) {
        if (!this.isInitialized) return null;
        
        // TRADUÇÃO AUTOMÁTICA DO TÍTULO
        const displayTitle = NotificationTitles[title] || NotificationTitles[title.toLowerCase()] || title;

        const notificationId = id || `notif-${Date.now()}`;
        
        // Cria o Toast Visual (Pop-up)
        const toast = this.createToastElement(displayTitle, message, type);
        this.container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), NotificationConfig.ANIMATION_DELAY);
        
        // Adiciona à lista interna (para o sino) apenas se não estiver no login
        if (!window.location.pathname.includes('login.html')) {
            this.activeNotifications.set(notificationId, { title: displayTitle, message, type });
            this.updateDropdown();
        }

        const removeToast = () => {
            if (toast.parentNode) {
                toast.classList.remove('show');
                toast.classList.add('hide');
                setTimeout(() => {
                    if (toast.parentNode) toast.remove();
                }, NotificationConfig.HIDE_ANIMATION_DURATION);
            }
        };
        
        const closeButton = toast.querySelector('.toast-close');
        if (closeButton) closeButton.addEventListener('click', removeToast);
        
        if (duration > 0) setTimeout(removeToast, duration);
        
        return toast;
    },

    createToastElement(title, message, type) {
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        const iconHTML = this.getIconHTML(type);
        
        toast.innerHTML = `
            <div class="toast-icon">${iconHTML}</div>
            <div class="toast-content">
                <div class="toast-title">${SecurityUtils.sanitizeHTML(title)}</div>
                <div class="toast-message">${SecurityUtils.sanitizeHTML(message)}</div>
            </div>
            <button class="toast-close">&times;</button>
        `;
        return toast;
    },

    getIconHTML(type) {
        const iconClass = NotificationConfig.ICONS[type] || 'fa-info-circle';
        return `<i class="fas ${iconClass}"></i>`;
    },

    setupBellIcon() {
        const bellIcon = document.getElementById('notification-bell-icon');
        const dropdown = document.getElementById('notification-dropdown');
        
        if (!bellIcon || !dropdown) return;
        
        // Inicia monitoramento de estoque
        if (typeof StockMonitor !== 'undefined') {
            StockMonitor.checkAndNotify();
        }
        
        bellIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('visible');
            this.updateDropdown();
        });

        window.addEventListener('click', () => dropdown.classList.remove('visible'));
        dropdown.addEventListener('click', (e) => e.stopPropagation());
    },

    updateDropdown() {
        const list = document.getElementById('notification-dropdown-list');
        if (!list) return;

        const countSpan = document.getElementById('notification-count');
        const bellIcon = document.getElementById('notification-bell-icon');
        const header = document.querySelector('.notification-dropdown-header');

        // Lógica do Botão de Configuração (Engrenagem) - Apenas Admin
        const role = localStorage.getItem('sinergy_user_role') || sessionStorage.getItem('sinergy_user_role');
        const roleLower = (role || '').toLowerCase();
        const isAdmin = (roleLower === 'admin' || roleLower === 'administrador');

        if (header && !header.querySelector('.btn-notif-config') && isAdmin) {
            header.innerHTML = `
                <div class="notification-header-actions">
                    <span>Notificações <span id="notification-count">(0)</span></span>
                    <button class="btn-notif-config" title="Criar Aviso do Sistema" onclick="NotificationManager.openConfigModal()">
                        <i class="fas fa-cog"></i>
                    </button>
                </div>
            `;
        }

        list.innerHTML = '';
        let count = 0;

        // 1. Renderiza Avisos do Sistema (FIXADOS NO TOPO)
        this.systemWarnings.forEach(warn => {
            const item = document.createElement('div');
            item.className = `notification-item system-alert ${warn.Tipo}`;
            
            let deleteBtn = '';
            if (isAdmin) {
                deleteBtn = `<button class="btn-delete-aviso" onclick="NotificationManager.deleteSystemWarning(${warn.ID})" title="Remover aviso"><i class="fas fa-trash"></i></button>`;
            }

            item.innerHTML = `
                <div class="notification-item-icon">${this.getIconHTML(warn.Tipo)}</div>
                <div class="notification-item-content">
                    <div class="notification-item-title">
                        ${SecurityUtils.sanitizeHTML(warn.Titulo)}
                        ${deleteBtn}
                    </div>
                    <div class="notification-item-message">${SecurityUtils.sanitizeHTML(warn.Mensagem)}</div>
                </div>
            `;
            list.appendChild(item);
            count++;
        });

        // 2. Renderiza Notificações Locais (Estoque, Sucesso, Erro, etc)
        const localNotifs = Array.from(this.activeNotifications.values()).reverse();
        localNotifs.forEach(notif => {
            const item = document.createElement('div');
            item.className = `notification-item ${notif.type}`;
            item.innerHTML = `
                <div class="notification-item-icon">${this.getIconHTML(notif.type)}</div>
                <div class="notification-item-content">
                    <div class="notification-item-title">${SecurityUtils.sanitizeHTML(notif.title)}</div>
                    <div class="notification-item-message">${SecurityUtils.sanitizeHTML(notif.message)}</div>
                </div>
            `;
            list.appendChild(item);
            count++;
        });

        if (count === 0) {
            list.innerHTML = `<div class="notification-empty-state">Nenhuma notificação no momento.</div>`;
            bellIcon.removeAttribute('data-count');
        } else {
            const countEl = document.getElementById('notification-count');
            if(countEl) countEl.textContent = `(${count})`;
            bellIcon.setAttribute('data-count', count);
        }
    }
};

// === MONITORAMENTO DE ESTOQUE ===
const StockMonitor = {
    LIMITE_ESTOQUE_GERAL: 6000,
    SESSION_ALERT_KEY: 'total_stock_alert_shown',
    limitesEstoque: {
        'Meia-Cana 125mm': { baixo: 4999, regular: 6999 },
        'Meia-Cana 136mm': { baixo: 2999, regular: 3999 },
        'Meia-Cana Transvision': { baixo: 2500, regular: 5000 },
        'Super-Cana': { baixo: 2500, regular: 4000 },
        'Guia 50': { baixo: 1000, regular: 1500 },
        'Guia 60': { baixo: 1000, regular: 1500 },
        'Guia 70': { baixo: 1500, regular: 2000 },
        'Guia 100': { baixo: 1000, regular: 1500 },
        'Soleira': { baixo: 1000, regular: 1500 },
        'Eixo': { baixo: 1500, regular: 2500 }
    },
    async checkAndNotify() {
        try {
            const stockData = await this.getStockDataFromAPI();
            if (!stockData) return;
            const totalWeight = this.calculateTotalWeight(stockData);
            this.checkGeneralLowStockAlert(totalWeight);
            this.checkLowStockPerMaterial(stockData);
        } catch (error) {
            console.error(error);
            this.handleStockError();
        }
    },
    async getStockDataFromAPI() {
        try {
            const response = await fetch('https://virtualcriacoes.com/sinergy/api/bobinas');
            if (!response.ok) throw new Error('Falha');
            const data = await response.json();
            return data.map(item => ({ ...item, Peso: parseFloat(item.Peso) }));
        } catch (error) { return null; }
    },
    calculateTotalWeight(bobinas) { return bobinas.reduce((total, bobina) => total + (Number(bobina.Peso) || 0), 0); },
    checkGeneralLowStockAlert(totalWeight) {
        const alertKey = 'general_low_stock';
        if (totalWeight < this.LIMITE_ESTOQUE_GERAL) {
            NotificationManager.activeNotifications.set(alertKey, { id: alertKey, type: 'error', title: 'Estoque Crítico', message: `Estoque geral abaixo de ${this.LIMITE_ESTOQUE_GERAL} kg.` });
            const alertShown = sessionStorage.getItem(this.SESSION_ALERT_KEY);
            if (!alertShown && NotificationManager.isInitialized) {
                NotificationManager.show({ title: 'Estoque Crítico', message: `O estoque geral está baixo (${totalWeight.toFixed(0)} kg).`, type: 'error', duration: 10000 });
                sessionStorage.setItem(this.SESSION_ALERT_KEY, 'true');
            }
        } else {
            NotificationManager.activeNotifications.delete(alertKey);
            sessionStorage.removeItem(this.SESSION_ALERT_KEY);
        }
    },
    async checkLowStockPerMaterial(stockData) {
        const summarizedData = {};
        stockData.forEach(bobina => {
            let tipo = bobina.Tipo;
            const peso = parseFloat(bobina.Peso);
            if (tipo === 'Meia-Cana') { const largura = parseFloat(bobina.Largura); if (largura === 125 || largura === 136) tipo = `Meia-Cana ${largura}mm`; }
            if (peso > 0) { if (!summarizedData[tipo]) summarizedData[tipo] = 0; summarizedData[tipo] += peso; }
        });
        for (const tipo in this.limitesEstoque) {
            const pesoTotal = summarizedData[tipo] || 0;
            const limites = this.limitesEstoque[tipo];
            const cleanType = tipo.replace(/\s/g, '_');
            if (pesoTotal <= limites.baixo) {
                const key = `low_${cleanType}`;
                NotificationManager.activeNotifications.set(key, { id: key, type: 'error', title: `Estoque Baixo: ${tipo}`, message: `Apenas ${pesoTotal.toFixed(0)} kg disponíveis.` });
                NotificationManager.activeNotifications.delete(`reg_${cleanType}`);
            } else if (pesoTotal > limites.baixo && pesoTotal <= limites.regular) {
                const key = `reg_${cleanType}`;
                NotificationManager.activeNotifications.set(key, { id: key, type: 'warning', title: `Atenção: ${tipo}`, message: `Nível regular: ${pesoTotal.toFixed(0)} kg.` });
                NotificationManager.activeNotifications.delete(`low_${cleanType}`);
            } else {
                NotificationManager.activeNotifications.delete(`low_${cleanType}`);
                NotificationManager.activeNotifications.delete(`reg_${cleanType}`);
            }
        }
        NotificationManager.updateDropdown();
    },
    handleStockError() {
        const bellIcon = document.getElementById('notification-bell-icon');
        if (bellIcon) { bellIcon.setAttribute('data-count', '?'); }
    },
};

// === MONITORAMENTO DE COMPRAS (NOVO) ===
const PurchaseMonitor = {
    lastCount: 0,
    interval: null,

    start() {
        // Só monitora se for Admin
        const role = localStorage.getItem('sinergy_user_role') || sessionStorage.getItem('sinergy_user_role');
        const roleLower = (role || '').toLowerCase();
        if (roleLower !== 'admin' && roleLower !== 'diretor' && roleLower !== 'administrador') return;

        this.check(); // Check imediato
        this.interval = setInterval(() => this.check(), 30000); // Check a cada 30s
    },

    async check() {
        try {
            // Busca solicitações pendentes
            const res = await fetch('https://virtualcriacoes.com/sinergy/api/solicitacoes-compras?role=admin');
            if (!res.ok) return;
            
            const compras = await res.json();
            const pendentes = compras.filter(c => c.Status === 'Pendente').length;

            // Se aumentou o número de pendências, notifica
            if (this.lastCount > 0 && pendentes > this.lastCount) {
                const novas = pendentes - this.lastCount;
                NotificationManager.show({
                    title: 'Nova Solicitação',
                    message: `${novas} nova(s) solicitação(ões) de compra aguardando aprovação.`,
                    type: 'info',
                    duration: 8000
                });
            }
            this.lastCount = pendentes;

            // Atualiza badge na tela da diretoria se ela estiver aberta
            const badgeDiretoria = document.getElementById('count-pendencias');
            if(badgeDiretoria) badgeDiretoria.textContent = pendentes;

        } catch (e) { console.error("Erro no monitor de compras", e); }
    }
};

document.addEventListener('DOMContentLoaded', () => { 
    NotificationManager.init(); 
    PurchaseMonitor.start(); // Inicia o monitor de compras
});

window.NotificationManager = NotificationManager;
window.StockMonitor = StockMonitor;
window.PurchaseMonitor = PurchaseMonitor;