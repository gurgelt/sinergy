/**
 * login.js - Versão corrigida
 */

document.addEventListener('DOMContentLoaded', function() {
    initLoginSystem();
});

const REMEMBER_USER = 'sinergy_remember';
// *** CORREÇÃO AQUI ***
const API_BASE_URL = 'https://virtualcriacoes.com/sinergy/api';

/**
 * Inicialização do sistema de login
 */
function initLoginSystem() {
    const elements = {
        forms: {
            login: document.getElementById('login-form'),
            recover: document.getElementById('recover-form')
        },
        buttons: {
            login: document.getElementById('login-button'),
            recover: document.getElementById('recover-button')
        },
        navigation: {
            showRecover: document.getElementById('show-recover'),
            backToLogin: document.getElementById('back-to-login')
        },
        notification: {
            container: document.getElementById('notification'),
            message: document.getElementById('notification-message'),
            close: document.getElementById('close-notification')
        },
        fields: {
            username: document.getElementById('username'),
            password: document.getElementById('password'),
            remember: document.getElementById('remember'),
            recoverEmail: document.getElementById('recover-email')
        }
    };
    
    setupNavigation(elements);
    setupFormEvents(elements);
    setupPasswordToggle();
    if(elements.notification.close) {
        elements.notification.close.addEventListener('click', function() {
            elements.notification.container.classList.remove('show');
        });
    }
    checkRememberedUser(elements.fields.username, elements.fields.remember);
    addEnterKeySupport(elements);
}

/**
 * Adicionar suporte para enviar formulário com Enter
 */
function addEnterKeySupport(elements) {
    if (elements.fields.password) {
        elements.fields.password.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                elements.buttons.login.click();
            }
        });
    }
    
    if (elements.fields.recoverEmail) {
        elements.fields.recoverEmail.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                elements.buttons.recover.click();
            }
        });
    }
}

/**
 * Configura eventos de navegação entre formulários
 */
function setupNavigation(elements) {
    if(elements.navigation.showRecover) {
        elements.navigation.showRecover.addEventListener('click', function() {
            switchForm(elements.forms.login, elements.forms.recover);
        });
    }
    
    if(elements.navigation.backToLogin) {
        elements.navigation.backToLogin.addEventListener('click', function() {
            switchForm(elements.forms.recover, elements.forms.login);
        });
    }
}

/**
 * Configura eventos de formulário
 */
function setupFormEvents(elements) {
    if(elements.buttons.login) {
        elements.buttons.login.addEventListener('click', function() {
            const username = elements.fields.username.value;
            const password = elements.fields.password.value;
            const remember = elements.fields.remember.checked;
            
            login(username, password, remember, elements);
        });
    }
    
    if(elements.buttons.recover) {
        elements.buttons.recover.addEventListener('click', function() {
            const email = elements.fields.recoverEmail.value;
            
            recoverPassword(email, elements);
        });
    }
}

/**
 * Configura eventos de alternância de visibilidade da senha
 */
function setupPasswordToggle() {
    document.querySelectorAll('.toggle-password').forEach(function(button) {
        button.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}

/**
 * Alterna entre formulários
 */
function switchForm(currentForm, targetForm) {
    currentForm.style.display = 'none';
    targetForm.style.display = 'block';
}

/**
 * Exibe uma notificação
 */
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    
    notificationMessage.textContent = message;
    notification.className = 'notification';
    notification.classList.add(type);
    notification.classList.add('show');
    
    if (type !== 'error') {
        setTimeout(function() {
            notification.classList.remove('show');
        }, 5000);
    }
}

/**
 * Função auxiliar para fazer requisições
 */
async function makeApiRequest(endpoint, data) {
    const url = `${API_BASE_URL}/${endpoint}`;
    
    console.log(`[DEBUG] Fazendo requisição para: ${url}`);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const responseText = await response.text();

        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (parseError) {
            console.error('[DEBUG] Erro ao fazer parse do JSON:', parseError);
            console.error('[DEBUG] Conteúdo que causou erro:', responseText);
            
            if (responseText.includes('<html>') || responseText.includes('<!DOCTYPE')) {
                throw new Error('Servidor retornou HTML em vez de JSON. Verifique a URL da API e se o endpoint existe.');
            } else {
                throw new Error(`Resposta inválida do servidor: ${responseText.substring(0, 100)}...`);
            }
        }

        return {
            ok: response.ok,
            status: response.status,
            data: responseData
        };

    } catch (error) {
        console.error('[DEBUG] Erro na requisição:', error);
        throw error;
    }
}

/**
 * Processa o login
 */
async function login(username, password, remember, elements) {
    if (!username || !password) {
        showNotification('Por favor, preencha todos os campos.', 'error');
        return;
    }

    elements.buttons.login.disabled = true;
    elements.buttons.login.textContent = 'Entrando...';

    try {
        const result = await makeApiRequest('login', { username, password });

        if (result.ok) {
            if (typeof loginSuccess === 'function') {
                loginSuccess(result.data, remember);
            } else {
                showNotification('Erro crítico: função loginSuccess não encontrada.', 'error');
            }
        } else {
            const errorMessage = result.data.error || `Erro HTTP ${result.status}`;
            showNotification(errorMessage, 'error');
            
            if (elements.forms.login) {
                elements.forms.login.classList.add('shake');
                setTimeout(function() {
                    elements.forms.login.classList.remove('shake');
                }, 500);
            }
        }
    } catch (error) {
        console.error('Erro completo:', error);
        
        let errorMessage = 'Erro ao conectar com o servidor.';
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
        } else if (error.message.includes('HTML em vez de JSON')) {
            errorMessage = 'Erro na configuração do servidor. Entre em contato com o suporte técnico.';
        }
        
        showNotification(errorMessage, 'error');
    } finally {
        elements.buttons.login.disabled = false;
        elements.buttons.login.textContent = 'Entrar';
    }
}

/**
 * Processa a recuperação de senha
 */
async function recoverPassword(email, elements) {
    if (!email) {
        showNotification('Por favor, informe seu e-mail.', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        showNotification('Por favor, insira um e-mail válido.', 'error');
        return;
    }
    
    showNotification('Enviando solicitação de recuperação...', 'info');

    try {
        const result = await makeApiRequest('recover-password', { email });

        if (result.ok) {
            showNotification('Se as informações estiverem corretas, você receberá um link para redefinir sua senha por e-mail.', 'success');
        } else {
            const errorMessage = result.data.error || `Erro HTTP ${result.status}`;
            showNotification(errorMessage, 'error');
        }
    } catch (error) {
        console.error('Erro na solicitação de recuperação:', error);
        showNotification('Erro ao conectar com o servidor. Tente novamente mais tarde.', 'error');
    }
    
    elements.fields.recoverEmail.value = '';
}

/**
 * Valida o formato de email
 */
function isValidEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
}

/**
 * Verifica se há um usuário lembrado
 */
function checkRememberedUser(usernameField, rememberField) {
    const rememberedUser = localStorage.getItem(REMEMBER_USER);
    if (rememberedUser) {
        usernameField.value = rememberedUser;
        rememberField.checked = true;
    }
}