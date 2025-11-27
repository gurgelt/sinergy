/**
 * js/rastreio.js
 */

// Dados simulados (Em memória)
// Se conectar ao backend, isso virá da API
let trackingData = [
    { ID: 1, Fornecedor: 'Jielong', StatusStep: 4, DataETA: '2025-12-28' },
    { ID: 2, Fornecedor: 'Canifornia', StatusStep: 6, DataETA: '2025-12-20' },
    { ID: 3, Fornecedor: 'Jielong', StatusStep: 2, DataETA: '2026-01-10' }
];

let currentEditId = null;

document.addEventListener('DOMContentLoaded', () => {
    initializeAppRastreio();
});

function initializeAppRastreio() {
    renderTrackingCards();
    setupDragAndDrop();
    setupEventListeners();
    
    document.getElementById('loader-overlay').style.display = 'none';
}

function setupEventListeners() {
    // Busca
    document.getElementById('search-input').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = trackingData.filter(t => t.Fornecedor.toLowerCase().includes(term));
        renderTrackingCards(filtered);
        // Re-aplica o drag após filtrar/renderizar
        setupDragAndDrop();
    });

    // Modais
    document.getElementById('btn-novo-rastreio').addEventListener('click', () => {
        document.getElementById('form-novo-rastreio').reset();
        document.getElementById('modal-novo-rastreio').classList.add('active');
    });

    document.getElementById('close-novo-rastreio').addEventListener('click', () => closeModal('modal-novo-rastreio'));
    document.getElementById('btn-cancelar-novo').addEventListener('click', () => closeModal('modal-novo-rastreio'));
    
    document.getElementById('close-status-rastreio').addEventListener('click', () => closeModal('modal-status-rastreio'));
    document.getElementById('btn-cancelar-status').addEventListener('click', () => closeModal('modal-status-rastreio'));

    // Salvar Novo
    document.getElementById('form-novo-rastreio').addEventListener('submit', (e) => {
        e.preventDefault();
        addNewContainer();
    });

    // Salvar Status
    document.getElementById('form-status-rastreio').addEventListener('submit', (e) => {
        e.preventDefault();
        updateContainerStatus();
    });
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function renderTrackingCards(data = trackingData) {
    const container = document.getElementById('tracking-list-container');
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #64748b;">Nenhum container encontrado.</p>';
        return;
    }

    data.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'tracking-card';
        card.setAttribute('draggable', 'true'); // Habilita arrastar
        card.dataset.id = item.ID; // ID para identificar no array

        const steps = getSteps(item.StatusStep, item.DataETA);
        const currentStepName = steps.find(s => s.active)?.nome || 'Desconhecido';
        const fillPct = (item.StatusStep / 8) * 100;
        const isCompleted = item.StatusStep === 8;

        // Renderiza Timeline HTML
        let timelineHTML = '';
        steps.forEach(step => {
            let className = 'timeline-item';
            if (step.completed) className += ' completed';
            if (step.active) className += ' active';
            if (step.active && step.step === 8) className += ' final';

            timelineHTML += `
                <li class="${className}">
                    ${step.nome}
                    ${step.eta ? `<span class="eta-info">ETA: ${formatDate(step.eta)}</span>` : ''}
                </li>
            `;
        });

        card.innerHTML = `
            <div class="tracking-card-header">
                <span class="header-title">Container ${index + 1}</span>
                <button class="header-actions-btn" onclick="openEditStatus(${item.ID})" title="Alterar Status">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
            <div class="tracking-card-body">
                <div class="info-row">
                    <strong>Fornecedor:</strong> ${item.Fornecedor}
                </div>
                <div class="info-row" style="color: #3498db; font-weight: 600;">
                    ${currentStepName}
                </div>

                <div class="container-fill-visual">
                    <div class="container-fill-icon"><i class="fas fa-ship"></i></div> 
                    <div class="container-outline">
                        <div class="container-fill-bar ${isCompleted ? 'completed' : ''}" style="--fill-percentage: ${fillPct}%;"></div>
                    </div>
                </div>

                <ul class="timeline">
                    ${timelineHTML}
                </ul>
            </div>
        `;
        container.appendChild(card);
    });
}

// === LÓGICA DE DRAG AND DROP (ARRASTAR) ===
function setupDragAndDrop() {
    const cards = document.querySelectorAll('.tracking-card');
    const container = document.getElementById('tracking-list-container');

    cards.forEach(card => {
        card.addEventListener('dragstart', () => {
            card.classList.add('dragging');
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            // Opcional: Aqui você salvaria a nova ordem no banco de dados se fosse persistente
            // saveNewOrder();
        });
    });

    container.addEventListener('dragover', e => {
        e.preventDefault(); // Permite soltar
        const afterElement = getDragAfterElement(container, e.clientY, e.clientX); // Passa X também se for grid
        const draggable = document.querySelector('.dragging');
        
        if (afterElement == null) {
            container.appendChild(draggable);
        } else {
            container.insertBefore(draggable, afterElement);
        }
    });
}

// Função auxiliar para determinar a posição de soltar
function getDragAfterElement(container, y, x) {
    const draggableElements = [...container.querySelectorAll('.tracking-card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        
        // Distância do centro do elemento
        const offsetX = x - box.left - box.width / 2;
        const offsetY = y - box.top - box.height / 2;
        
        // Simplificação para grid: usa a distância euclidiana ou apenas Y dependendo do comportamento desejado
        // Para um grid robusto, a lógica é complexa, mas para reordenação simples visual:
        
        // Vamos usar uma aproximação baseada apenas na ordem visual (DOM)
        // Se o mouse está antes do meio do elemento, retornamos ele como referência
        if (offsetX < 0 && offsetY < 0 && offsetX > closest.offset && offsetY > closest.offset) {
             return { offset: offsetX, element: child };
        } else {
            // Fallback simples (funciona bem para listas, razoável para grids)
            return closest;
        }
        
        // Melhor abordagem genérica para Grid: Menor distância
        const dist = Math.hypot(x - (box.left + box.width / 2), y - (box.top + box.height / 2));
        if (dist < closest.dist) {
            return { dist: dist, element: child };
        } else {
            return closest;
        }

    }, { dist: Number.POSITIVE_INFINITY }).element;
}

// === CRUD SIMPLIFICADO ===

function addNewContainer() {
    const fornecedor = document.getElementById('input-fornecedor').value;
    const etapa = parseInt(document.getElementById('input-etapa').value);
    const eta = document.getElementById('input-eta').value;

    const newItem = {
        ID: Date.now(),
        Fornecedor: fornecedor,
        StatusStep: etapa,
        DataETA: eta
    };

    trackingData.push(newItem);
    renderTrackingCards();
    setupDragAndDrop();
    closeModal('modal-novo-rastreio');
    
    if(window.NotificationManager) NotificationManager.show({title: 'Sucesso', message: 'Container adicionado!', type: 'success'});
}

window.openEditStatus = function(id) {
    currentEditId = id;
    const item = trackingData.find(t => t.ID === id);
    if(!item) return;

    document.getElementById('input-novo-status').value = item.StatusStep;
    document.getElementById('modal-status-rastreio').classList.add('active');
};

function updateContainerStatus() {
    if (!currentEditId) return;
    const novaEtapa = parseInt(document.getElementById('input-novo-status').value);
    
    const index = trackingData.findIndex(t => t.ID === currentEditId);
    if (index !== -1) {
        trackingData[index].StatusStep = novaEtapa;
        renderTrackingCards();
        setupDragAndDrop();
        closeModal('modal-status-rastreio');
        if(window.NotificationManager) NotificationManager.show({title: 'Sucesso', message: 'Status atualizado!', type: 'success'});
    }
}

// Utils
function getSteps(current, etaDate) {
    const steps = [
        { step: 1, nome: 'Pedido Confirmado' },
        { step: 2, nome: 'Em Produção' },
        { step: 3, nome: 'Pronto para Embarque' },
        { step: 4, nome: 'Em Trânsito', eta: etaDate },
        { step: 5, nome: 'Chegada em Santos' },
        { step: 6, nome: 'Desembaraço' },
        { step: 7, nome: 'Liberado' },
        { step: 8, nome: 'Entregue' }
    ];
    
    return steps.map(s => ({
        ...s,
        completed: s.step < current,
        active: s.step === current
    }));
}

function formatDate(d) {
    if (!d) return '';
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}