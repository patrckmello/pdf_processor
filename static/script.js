let allFiles = [];
let selectedFiles = [];
let selectedSplitMode = null;
let sortableInstance = null;
let pdfDocForOrganize = null; // Variável global para o PDF no modo Organizar

// Referências a elementos DOM
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('fileInput');
const splitBtn = document.getElementById('split-btn');
const mergeBtn = document.getElementById('merge-btn');
// const functionBtn = document.querySelector('.function-btn'); // Pouco usado, pode ser removido se não necessário
const mergeMenu = document.getElementById('mergeMenu');
const splitMenu = document.getElementById('splitMenu');
const organizeMenu = document.getElementById('organizeMenu'); // Usado para verificar se está ativo
const convertMenu = document.getElementById('convertMenu');

// Seletor mais específico para o botão de fechar principal (se houver múltiplos)
// Se só houver um .close-btn globalmente e for para os menus laterais, ok.
// Se cada menu tem seu próprio botão de fechar, eles precisarão de listeners individuais.
// Assumindo que closeBtn é para os menus laterais principais.
const closeMenuButtons = document.querySelectorAll('.close-btn'); // Pega todos os botões de fechar

const startMergeBtn = document.getElementById('start-merge');
const startSplitBtn = document.getElementById('start-split');
const startOrganizeBtn = document.getElementById('start-organize');
const startConvertBtn = document.getElementById('start-convert');

const previewContainer = document.getElementById('sortable-preview'); // Onde as páginas/arquivos são renderizados
const previewTitle = document.getElementById('preview-title');

const errorMessage = document.getElementById('error-message');
const errorMessage2 = document.getElementById('error-message2');
const errorMessage3 = document.getElementById('error-message3');

const sortIcon = document.getElementById('sort-icon');
const sortMenu = document.getElementById('sort-menu');
const sortAscBtn = document.getElementById('sort-asc-btn');
const sortDescBtn = document.getElementById('sort-desc-btn');

const modeButtons = document.querySelectorAll('.mode-btn');
const partsOption = document.getElementById('parts-option');
const sizeOption = document.getElementById('size-option');

const organizeMainBtn = document.getElementById('organize-btn'); // Botão principal para entrar no modo Organizar

// Botões de ação dentro da organização de página
const rotateIcon = document.getElementById('rotate-icon'); // AGORA é o BOTÃO que contém a imagem de girar todas as páginas


// --- CONFIGURAÇÃO INICIAL DE EVENTOS ---
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.backgroundColor = '#d7e5f5';
});
dropZone.addEventListener('dragleave', () => {
    dropZone.style.backgroundColor = '';
});
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.backgroundColor = '';
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        handleFiles(files);
    }
});
fileInput.addEventListener('change', () => {
    const files = fileInput.files;
    if (files.length > 0) {
        handleFiles(files);
    }
});

// --- FUNÇÕES UTILITÁRIAS ---
function hideAllErrors() {
    errorMessage.style.display = 'none';
    errorMessage2.style.display = 'none';
    errorMessage3.style.display = 'none';
}

function isNumericName(name) {
    return /^\d+$/.test(name.split('.').shift());
}

function showSpinner(menuId) { // Aceita o ID do menu para mostrar o spinner correto
    const spinner = document.querySelector(`#${menuId} #loading-spinner`);
    if (spinner) spinner.classList.remove('hidden');
}

function hideSpinner(menuId) { // Aceita o ID do menu para esconder o spinner correto
    const spinner = document.querySelector(`#${menuId} #loading-spinner`);
    if (spinner) spinner.classList.add('hidden');
}

// --- LÓGICA DE PRÉ-VISUALIZAÇÃO DE ARQUIVOS (UPLOAD INICIAL) ---
async function handleFiles(files) {
    hideAllErrors();
    const newFiles = Array.from(files);
    newFiles.forEach(file => {
        if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
            selectedFiles.push(file);
        }
    });
    await rebuildFilePreviews(); // Renomeado para clareza
}

async function rebuildFilePreviews() { // Anteriormente rebuildPreviews
    console.log('Reconstruindo pré-visualizações de ARQUIVOS...');
    previewContainer.innerHTML = ''; // Limpa tudo, seja arquivo ou página

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        // createPreview agora é para ARQUIVOS, não páginas individuais de um PDF
        await createFilePreview(file, i); // Renomeado para clareza
    }

    updatePreviewIndices(); // Para data-index dos arquivos
    updateMergeButtonState(); // Para o botão de unir
    checkPreviewVisibility(); // Para o grid de preview

    if (sortableInstance) sortableInstance.destroy();
    sortableInstance = Sortable.create(previewContainer, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        // Não adicione 'delay' aqui, pois o clique nos previews de ARQUIVO é para remoção.
        // A seleção de arquivos para funções como 'unir' é implícita (todos os carregados).
    });
    document.getElementById('preview-container-grid').style.display = 'block';
}

function createFilePreview(file, index) { // Anteriormente createPreview
    return new Promise((resolve) => {
        const fileReader = new FileReader();
        fileReader.onload = async function () {
            const wrapper = document.createElement('div');
            wrapper.classList.add('preview-wrapper'); // Esta classe é usada para seleção de PÁGINAS também. Ok.
            wrapper.setAttribute('data-index', index); // Índice do ARQUIVO na lista selectedFiles
            wrapper.setAttribute('data-filename', file.name);

            const canvas = document.createElement('canvas');
            canvas.classList.add('preview-canvas'); // Usado pelo CSS

            // Renderiza a primeira página do PDF como preview do ARQUIVO
            if (file.type === 'application/pdf') {
                try {
                    const typedarray = new Uint8Array(this.result);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    const page = await pdf.getPage(1);
                    const viewport = page.getViewport({ scale: 0.4 });
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    const context = canvas.getContext('2d');
                    await page.render({ canvasContext: context, viewport }).promise;
                } catch (pdfError) {
                    console.error("Erro ao renderizar preview do PDF (arquivo):", pdfError);
                    const context = canvas.getContext('2d');
                    canvas.width = 160 * 0.4 * 2.5; // Largura padrão
                    canvas.height = 226 * 0.4 * 2.5; // Altura padrão (A4ish)
                    context.fillStyle = '#ccc';
                    context.fillRect(0, 0, canvas.width, canvas.height);
                    context.fillStyle = 'black';
                    context.fillText('Erro no PDF', 10, 20);
                }
            } else {
                // Para outros tipos de arquivo, você pode querer mostrar um ícone genérico
                // Por simplicidade, vamos apenas mostrar o nome do arquivo e um placeholder
                canvas.width = 100; canvas.height = 100; // Placeholder
                const context = canvas.getContext('2d');
                context.fillStyle = '#eee';
                context.fillRect(0, 0, 100, 100);
                context.fillStyle = 'black';
                context.fillText('?', 45, 55);
            }


            const removeBtn = document.createElement('button');
            removeBtn.textContent = '×';
            removeBtn.classList.add('remove-btn');
            removeBtn.title = 'Remover arquivo';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Impede que o clique no X selecione/deselecione o wrapper
                console.log(`Removendo arquivo: ${file.name} no índice ${index}`);
                previewContainer.removeChild(wrapper);
                selectedFiles.splice(index, 1); // Remove o arquivo da lista
                rebuildFilePreviews(); // Reconstroi para atualizar índices e tudo mais
            });

            const fileNameEl = document.createElement('p');
            fileNameEl.textContent = file.name;
            fileNameEl.classList.add('file-name');

            wrapper.appendChild(fileNameEl);
            wrapper.appendChild(canvas);
            wrapper.appendChild(removeBtn);
            previewContainer.appendChild(wrapper);
            resolve();
        };
        if (file.type === 'application/pdf') {
            fileReader.readAsArrayBuffer(file);
        } else {
            // Para arquivos não-PDF, não precisamos ler o buffer para este preview simples
            fileReader.onload(null); // Chama o onload diretamente
        }
    });
}

function updatePreviewIndices() { // Atualiza data-index dos ARQUIVOS
    const previews = previewContainer.querySelectorAll('.preview-wrapper');
    previews.forEach((prev, newIndex) => {
        prev.setAttribute('data-index', newIndex);
    });
}

function updateMergeButtonState() {
    startMergeBtn.disabled = selectedFiles.length < 2;
    // errorMessage para merge é gerenciado no clique do botão
}

function checkPreviewVisibility() { // Visibilidade do grid de ARQUIVOS
    document.getElementById('preview-container-grid').style.display = selectedFiles.length > 0 ? 'block' : 'none';
}


// --- LÓGICA DE ORDENAÇÃO DE ARQUIVOS (lista inicial) ---
sortIcon.addEventListener("click", function (event) {
    event.stopPropagation(); // Impede que feche o menu de ordenação de arquivos ao clicar no ícone
    sortMenu.style.display = sortMenu.style.display === "none" ? "block" : "none";
});
document.addEventListener("click", function (event) { // Fechar menu de ordenação de arquivos ao clicar fora
    if (sortMenu && sortIcon && !sortMenu.contains(event.target) && event.target !== sortIcon) {
        sortMenu.style.display = "none";
    }
});
sortAscBtn.addEventListener('click', async () => {
    console.log('Ordenar arquivos crescente');
    sortMenu.style.display = 'none';
    selectedFiles.sort((a, b) => {
        const nameA = a.name.split('.').shift();
        const nameB = b.name.split('.').shift();
        if (isNumericName(nameA) && isNumericName(nameB)) return Number(nameA) - Number(nameB);
        return nameA.localeCompare(nameB);
    });
    await rebuildFilePreviews();
});
sortDescBtn.addEventListener('click', async () => {
    console.log('Ordenar arquivos decrescente');
    sortMenu.style.display = 'none';
    selectedFiles.sort((a, b) => {
        const nameA = a.name.split('.').shift();
        const nameB = b.name.split('.').shift();
        if (isNumericName(nameA) && isNumericName(nameB)) return Number(nameB) - Number(nameA);
        return nameB.localeCompare(nameA);
    });
    await rebuildFilePreviews();
});


// --- MENUS LATERAIS (Merge, Split, Organize, Convert) ---
function openMergeMenu() { hideAllErrors(); mergeMenu.style.right = '0'; }
function closeMergeMenu() { mergeMenu.style.right = '-600px'; }
function openSplitMenu() { hideAllErrors(); splitMenu.style.right = '0'; }
function closeSplitMenu() { splitMenu.style.right = '-600px'; }
function openConvertMenu() { hideAllErrors(); convertMenu.style.right = '0'; }
function closeConvertMenu() { convertMenu.style.right = '-600px'; }

function openOrganizeMenu() {
    hideAllErrors();
    organizeMenu.style.right = '0'; // Abre o painel lateral de opções "Organizar"
    
    // Configura a área de preview para o modo de organização de PÁGINAS
    sortIcon.style.display = 'none'; // Esconde o ícone de ordenar ARQUIVOS
    sortMenu.style.display = 'none'; // Esconde o menu de ordenar ARQUIVOS
    previewTitle.textContent = 'Organize as páginas na ordem desejada:';
    
    const actionButtonsContainer = document.getElementById('page-action-buttons-container');
    if (actionButtonsContainer) {
        actionButtonsContainer.style.display = 'flex'; 
    }
    updateRotateSelectedBtnVisibility(); // Controla o botão "Girar Selecionadas"
    console.log("Modo Organizar ATIVADO. Botões de ação de página deveriam estar visíveis.");
}

function closeOrganizeMenu() {
    organizeMenu.style.right = '-600px'; 
    
    const actionButtonsContainer = document.getElementById('page-action-buttons-container');
    if (actionButtonsContainer) {
        actionButtonsContainer.style.display = 'none'; 
    }
    
    sortIcon.style.display = 'block'; // Mostra novamente o ícone de ordenar ARQUIVOS
    previewTitle.textContent = 'Pré-visualização (arraste para ordenar):'; // Restaura título

    // Limpa seleções de PÁGINA e o PDF de organização
    const selectedPageWrappers = previewContainer.querySelectorAll('.preview-wrapper.selected');
    selectedPageWrappers.forEach(wrapper => wrapper.classList.remove('selected'));
    pdfDocForOrganize = null;

    // IMPORTANTE: Após sair do modo Organizar, reconstruir a lista de ARQUIVOS
    // para limpar as previews de PÁGINA e restaurar as previews de ARQUIVO.
    rebuildFilePreviews();
    console.log("Modo Organizar FECHADO. Previews de arquivo restauradas.");
}

// Event listeners para botões de fechar dos menus laterais
closeMenuButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Identifica qual menu fechar com base no pai do botão
        const parentMenu = btn.closest('.merge-menu, .split-menu, .organize-menu, .convert-menu');
        if (parentMenu) {
            parentMenu.style.right = '-600px';
            if (parentMenu.id === 'organizeMenu') { // Se fechou o menu de organizar
                closeOrganizeMenu(); // Chama a lógica específica de limpeza do organize
            }
        }
        hideAllErrors(); // Esconde todas as mensagens de erro
    });
});


// --- LÓGICA DO BOTÃO "ORGANIZAR" PRINCIPAL ---
organizeMainBtn.addEventListener('click', () => {
    hideAllErrors();
    if (selectedFiles.length === 0) {
        errorMessage2.textContent = '⚠️ Por favor, selecione um arquivo PDF para organizar.';
        errorMessage2.style.display = "block";
    } else if (selectedFiles.length > 1) {
        errorMessage2.textContent = '⚠️ Por favor, selecione APENAS UM arquivo PDF para organizar suas páginas.';
        errorMessage2.style.display = "block";
    } else if (selectedFiles[0].type !== 'application/pdf') {
        errorMessage2.textContent = '⚠️ Apenas arquivos PDF podem ser organizados.';
        errorMessage2.style.display = "block";
    }
    else {
        console.log("Botão Organizar clicado. Preparando para gerar previews de PÁGINA.");
        generatePagePreviews(); // Renomeado de generateOrganizePreviews para clareza
        openOrganizeMenu();
    }
});

// --- GERAÇÃO DE PRÉ-VISUALIZAÇÃO DE PÁGINAS (DENTRO DE "ORGANIZAR") ---
async function generatePagePreviews() { // Renomeado de generateOrganizePreviews
    if (selectedFiles.length === 0 || !selectedFiles[0]) {
        console.error("Nenhum arquivo PDF selecionado para organizar.");
        errorMessage2.textContent = '⚠️ Nenhum arquivo PDF selecionado.';
        errorMessage2.style.display = 'block';
        return;
    }
    const file = selectedFiles[0]; // Pega o ÚNICO arquivo selecionado para organizar
    
    try {
        const buffer = await file.arrayBuffer();
        pdfDocForOrganize = await pdfjsLib.getDocument({ data: buffer }).promise;
    } catch (error) {
        console.error("Erro ao carregar PDF em generatePagePreviews:", error);
        errorMessage2.textContent = '⚠️ Erro ao carregar o arquivo PDF. Ele pode estar corrompido.';
        errorMessage2.style.display = 'block';
        pdfDocForOrganize = null; // Garante que está nulo
        return;
    }
    
    previewContainer.innerHTML = ''; // Limpa previews de ARQUIVO para mostrar previews de PÁGINA
    console.log('Iniciando generatePagePreviews para o arquivo:', file.name);

    async function renderPage(canvas, pageNum, scale, rotation) { // pageNum é 1-based
        try {
            const page = await pdfDocForOrganize.getPage(pageNum);
            const viewport = page.getViewport({ scale: scale, rotation: rotation });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext('2d');
            await page.render({ canvasContext: context, viewport: viewport }).promise;
        } catch (renderErr) {
            console.error(`Erro ao renderizar página ${pageNum}:`, renderErr);
            // Desenha um placeholder de erro no canvas
            const context = canvas.getContext('2d');
            context.fillStyle = '#fdd';
            context.fillRect(0,0,canvas.width, canvas.height);
            context.fillStyle = 'red';
            context.fillText(`Erro p.${pageNum}`, 10, 20);
        }
    }

    for (let pageNum = 1; pageNum <= pdfDocForOrganize.numPages; pageNum++) {
        const canvas = document.createElement('canvas');
        // Renderiza inicialmente sem rotação. A rotação será aplicada depois se necessário.
        await renderPage(canvas, pageNum, 0.5, 0);

        const wrapper = document.createElement('div');
        wrapper.classList.add('preview-wrapper'); // Usado para seleção e estilo
        wrapper.dataset.pageNum = pageNum;    // 1-based, para referência à página original
        wrapper.dataset.rotation = 0;       // Rotação inicial

        // LOG DE DIAGNÓSTICO PARA MOUSEDOWN EM PÁGINAS
        wrapper.addEventListener('mousedown', (e) => {
            console.log('MOUSEDOWN na PÁGINA wrapper:', pageNum, 'Target:', e.target);
        });

        // LISTENER DE CLIQUE PARA SELEÇÃO DA PÁGINA
        wrapper.addEventListener('click', (event) => {
            console.log('CLICK na PÁGINA wrapper:', pageNum, 'Target:', event.target);
            if (event.target.classList.contains('rotate-btn-page')) { // Verifica o botão de rotação individual da PÁGINA
                console.log('Clique foi no botão de girar PÁGINA individual.');
                return; 
            }
            wrapper.classList.toggle('selected');
            console.log(`PÁGINA ${pageNum} classe "selected" alternada. Selecionado: ${wrapper.classList.contains('selected')}`);
            updateRotateSelectedBtnVisibility();
        });
        
        const pageNumberDisplay = document.createElement('p');
        pageNumberDisplay.textContent = `Pág. ${pageNum}`;
        pageNumberDisplay.classList.add('page-number-display'); // Adicione estilo para isso

        const rotateBtnPage = document.createElement('button'); // Botão de rotação INDIVIDUAL da PÁGINA
        rotateBtnPage.textContent = '⟳';
        rotateBtnPage.classList.add('rotate-btn-page'); // Classe diferente do .rotate-btn de ARQUIVO
        rotateBtnPage.title = `Girar página ${pageNum}`;
        rotateBtnPage.addEventListener('click', async (e) => {
            e.stopPropagation(); // Impede que o clique no botão selecione o wrapper
            let currentRotation = parseInt(wrapper.dataset.rotation) || 0;
            currentRotation = (currentRotation + 90) % 360;
            wrapper.dataset.rotation = currentRotation;
            console.log(`PÁGINA ${pageNum} girada individualmente para ${currentRotation} graus.`);
            await renderPage(canvas, pageNum, 0.5, currentRotation);
        });

        wrapper.appendChild(pageNumberDisplay); // Mostra número da página
        wrapper.appendChild(canvas);
        wrapper.appendChild(rotateBtnPage); // Botão de girar individual da PÁGINA
        previewContainer.appendChild(wrapper);
    }

    if (sortableInstance) sortableInstance.destroy(); // Destroi instância anterior (de arquivos)
    sortableInstance = Sortable.create(previewContainer, { // Nova instância para PÁGINAS
        animation: 150,
        ghostClass: 'sortable-ghost',
        delay: 150, // Reduzido um pouco, mas mantenha se 200ms estiver ok
        delayOnTouchOnly: false,
        forceFallback: true, 
        fallbackClass: "sortable-fallback",
        onStart: function(evt) {
            console.log('SORTABLE.JS (PÁGINAS): Drag iniciou (onStart)', evt.item);
        }
    });
    console.log('generatePagePreviews concluído. Previews de PÁGINA renderizadas.');
}

// --- BOTÕES DE AÇÃO DA PÁGINA (DENTRO DE "ORGANIZAR") ---
function updateRotateSelectedBtnVisibility() {
    const rotateSelectedBtn = document.getElementById('rotate-selected-btn');
    if (!rotateSelectedBtn) {
        console.warn("Botão #rotate-selected-btn não encontrado no DOM.");
        return;
    }
    const selectedCount = previewContainer.querySelectorAll('.preview-wrapper.selected').length;
    // Verifica se o menu de organização está visível
    const organizeMenuEl = document.getElementById('organizeMenu'); 

    if (selectedCount > 0 && organizeMenuEl && organizeMenuEl.style.right === '0px') {
        rotateSelectedBtn.style.display = 'inline-flex'; // Usar 'inline-flex' para consistência com CSS
        console.log(`Botão "Girar Selecionadas" VISÍVEL (${selectedCount} selecionadas)`);
    } else {
        rotateSelectedBtn.style.display = 'none';
        console.log(`Botão "Girar Selecionadas" OCULTO (Selecionadas: ${selectedCount}, Menu Organizar aberto: ${organizeMenuEl && organizeMenuEl.style.right === '0px'})`);
    }
}

// Listener para o botão GIRAR TODAS AS PÁGINAS (o #rotate-icon, que agora é um <button>)
if (rotateIcon) { // rotateIcon é o <button id="rotate-icon">
    rotateIcon.addEventListener('click', () => {
        console.log('--- Botão "Girar TODAS as Páginas" (rotate-icon) CLICADO ---');
        if (!pdfDocForOrganize) {
            console.error("Girar TODAS: pdfDocForOrganize é nulo.");
            return;
        }
        const pageWrappers = previewContainer.querySelectorAll('.preview-wrapper');
        if (pageWrappers.length === 0) {
            console.warn("Girar TODAS: Nenhum wrapper de página encontrado.");
            return;
        }
        
        pageWrappers.forEach(async wrapper => { // Adicionado async aqui para o await renderPage
            let currentRotation = parseInt(wrapper.dataset.rotation) || 0;
            currentRotation = (currentRotation + 90) % 360;
            wrapper.dataset.rotation = currentRotation; // Atualiza o dado para o backend

            const canvas = wrapper.querySelector('canvas');
            const pageNum = parseInt(wrapper.dataset.pageNum); // pageNum é 1-based
            
            if (canvas && pageNum) {
                console.log(`Girar TODAS: Girando página ${pageNum} para ${currentRotation} graus.`);
                // Re-renderiza a página com a nova rotação para consistência visual e de dados
                // Busca a função renderPage definida em generatePagePreviews (precisa estar acessível)
                // Para simplificar, vamos redefinir renderPage aqui se não estiver no escopo.
                // Idealmente, renderPage seria uma função global ou passada.
                // Por agora, vamos assumir que uma função renderPage(canvas, pageNum, scale, rotation) está disponível e usa pdfDocForOrganize
                // Isso requer que renderPage seja acessível ou que façamos a lógica aqui.
                // A canvas.style.transform era uma solução visual rápida, mas não atualiza a renderização do PDFJS.
                // Para que a rotação seja "real" (e não só CSS transform), precisamos re-renderizar com pdfjs.
                
                //  Esta é a função renderPage de dentro de generatePagePreviews. Precisamos dela aqui.
                //  Para evitar redefinição, ela deveria ser uma função de escopo mais alto.
                //  Por agora, para teste, vou copiar a lógica essencial:
                try {
                    const page = await pdfDocForOrganize.getPage(pageNum);
                    const viewport = page.getViewport({ scale: 0.5, rotation: currentRotation });
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const context = canvas.getContext('2d');
                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                } catch (err) {
                    console.error(`Erro ao re-renderizar pág ${pageNum} em Girar TODAS:`, err);
                }

            } else {
                console.warn(`Girar TODAS: Canvas ou pageNum não encontrado para wrapper:`, wrapper);
            }
        });
        console.log('--- Girar TODAS: Processo de rotação de todas as páginas CONCLUÍDO ---');
    });
} else {
    console.error("Elemento #rotate-icon (botão Girar Todas as Páginas) não encontrado!");
}


// Listeners para #rotate-selected-btn e #select-all-pages-btn DENTRO DE DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    const rotateSelectedBtn = document.getElementById('rotate-selected-btn');
    if (rotateSelectedBtn) {
        rotateSelectedBtn.addEventListener('click', async () => {
            console.log('--- Botão "Girar Selecionadas" CLICADO ---'); 
            if (!pdfDocForOrganize) {
                console.error("Girar Selecionadas ERRO: pdfDocForOrganize é nulo ou indefinido!"); 
                alert("Erro: Documento PDF não está carregado para organização. Tente recarregar.");
                return;
            }
            console.log("Girar Selecionadas INFO: pdfDocForOrganize está definido.", pdfDocForOrganize); 

            const selectedWrappers = previewContainer.querySelectorAll('.preview-wrapper.selected');
            console.log(`Girar Selecionadas INFO: Encontrados ${selectedWrappers.length} wrappers com a classe ".selected".`); 

            if (selectedWrappers.length === 0) {
                console.warn("Girar Selecionadas AVISO: Nenhum wrapper selecionado encontrado. Ação interrompida."); 
                updateRotateSelectedBtnVisibility(); 
                return;
            }
            
            // Função renderPage precisa estar acessível aqui também.
            // Reutilizando a lógica, mas idealmente seria uma função helper global.
            async function renderPageInternal(canvas, pageNum, scale, rotation) {
                try {
                    console.log(`renderPageInternal (Girar Selecionadas): Tentando obter página ${pageNum}.`);
                    const page = await pdfDocForOrganize.getPage(pageNum);
                    const viewport = page.getViewport({ scale: scale, rotation: rotation });
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const context = canvas.getContext('2d');
                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    console.log(`renderPageInternal (Girar Selecionadas): Página ${pageNum} re-renderizada com rotação ${rotation}.`);
                } catch (renderError) {
                    console.error(`renderPageInternal (Girar Selecionadas) ERRO página ${pageNum}, rotação ${rotation}:`, renderError);
                }
            }

            console.log("Girar Selecionadas INFO: Iniciando loop para girar páginas selecionadas...");
            for (const wrapper of selectedWrappers) {
                let currentRotation = parseInt(wrapper.dataset.rotation) || 0;
                currentRotation = (currentRotation + 90) % 360;
                wrapper.dataset.rotation = currentRotation;

                const canvas = wrapper.querySelector('canvas');
                const pageNum = parseInt(wrapper.dataset.pageNum); // pageNum é 1-based
                console.log(`Girar Selecionadas LOOP: Preparando para girar página ${pageNum} para ${currentRotation} graus.`); 
                if (!canvas || !pageNum) {
                    console.error(`Girar Selecionadas ERRO: Canvas ou pageNum não encontrado para wrapper. Canvas: ${!!canvas}, PageNum: ${pageNum}`);
                    continue; 
                }
                await renderPageInternal(canvas, pageNum, 0.5, currentRotation);
            }
            console.log('--- Girar Selecionadas: Processo de rotação CONCLUÍDO ---'); 
        });
    } else {
        console.error("Botão #rotate-selected-btn não encontrado no DOM ao configurar listener.");
    }

    const selectAllPagesBtn = document.getElementById('select-all-pages-btn');
    if (selectAllPagesBtn) {
        selectAllPagesBtn.addEventListener('click', () => {
            console.log('--- Botão "Selecionar Todas as Páginas" CLICADO ---');
            if (!previewContainer) {
                console.error("Selecionar Todas ERRO: 'previewContainer' (sortable-preview) não encontrado.");
                return;
            }
            const pageWrappers = previewContainer.querySelectorAll('.preview-wrapper');
            console.log(`Selecionar Todas: Encontrados ${pageWrappers.length} pageWrappers.`);

            if (pageWrappers.length === 0) {
                console.warn("Selecionar Todas: Nenhum wrapper de página para selecionar.");
                updateRotateSelectedBtnVisibility();
                return;
            }

            let allCurrentlySelected = true;
            pageWrappers.forEach(wrapper => {
                if (!wrapper.classList.contains('selected')) {
                    allCurrentlySelected = false;
                }
            });

            if (!allCurrentlySelected) {
                console.log("Selecionar Todas: Aplicando seleção a todas as páginas.");
                pageWrappers.forEach(wrapper => {
                    wrapper.classList.add('selected');
                });
            } else {
                console.log("Selecionar Todas: Removendo seleção de todas as páginas.");
                pageWrappers.forEach(wrapper => {
                    wrapper.classList.remove('selected');
                });
            }
            updateRotateSelectedBtnVisibility();
            console.log("Selecionar Todas: updateRotateSelectedBtnVisibility FOI CHAMADO.");
        });
    } else {
        console.error("Botão #select-all-pages-btn não encontrado no DOM ao configurar listener.");
    }
});


// --- LÓGICA DOS BOTÕES PRINCIPAIS DE FUNÇÃO (Merge, Split, Convert) ---
// (O botão Organize já está acima)

mergeBtn.addEventListener('click', () => {
    hideAllErrors();
    if (selectedFiles.length < 2) {
        errorMessage3.textContent = '⚠️ Selecione pelo menos 2 arquivos PDF para unir.';
        errorMessage3.style.display = "block";
    } else {
        // Verificar se todos os selectedFiles são PDFs
        if (selectedFiles.every(file => file.type === 'application/pdf')) {
            openMergeMenu();
            closeSplitMenu(); // Garante que outros menus de função estejam fechados
            closeOrganizeMenu();
            closeConvertMenu();
        } else {
            errorMessage3.textContent = '⚠️ Apenas arquivos PDF podem ser unidos.';
            errorMessage3.style.display = "block";
        }
    }
});

splitBtn.addEventListener('click', () => {
    hideAllErrors();
    if (selectedFiles.length === 0) {
        errorMessage2.textContent = '⚠️ Por favor, selecione um arquivo PDF para dividir.';
        errorMessage2.style.display = "block";
    } else if (selectedFiles.length > 1) {
        errorMessage2.textContent = '⚠️ Por favor, selecione APENAS UM arquivo PDF para dividir.';
        errorMessage2.style.display = "block";
    } else if (selectedFiles[0].type !== 'application/pdf') {
        errorMessage2.textContent = '⚠️ Apenas arquivos PDF podem ser divididos.';
        errorMessage2.style.display = "block";
    }
    else {
        openSplitMenu();
        closeMergeMenu();
        closeOrganizeMenu();
        closeConvertMenu();
    }
});

// O convertBtn não está sendo usado ativamente conforme seu código comentado, mas se for:
// if (convertBtn) {
// convertBtn.addEventListener('click', () => { ... });
// }


// --- LÓGICA DE SUBMISSÃO DAS FUNÇÕES (Merge, Split, Organize, Convert) ---
startMergeBtn.addEventListener('click', () => {
    showSpinner('mergeMenu'); // Passa o ID do menu correto
    hideAllErrors();
    // ... (resto da lógica de merge, parece ok) ...
    // No final ou erro: hideSpinner('mergeMenu');
    // No setTimeout de resetApp:
    // setTimeout(() => { hideSpinner('mergeMenu'); resetApp(); }, 3000);
    // Na catch: hideSpinner('mergeMenu'); alert(...);

    // Vou adicionar os hideSpinner faltantes como exemplo:
    if (selectedFiles.length === 0) { // selectedFiles refere-se aos ARQUIVOS GLOBAIS
        hideSpinner('mergeMenu');
        errorMessage2.textContent = '⚠️ Por favor, selecione arquivos antes de tentar unir.';
        errorMessage2.style.display = 'block';
        return;
    }
    // Pega a ordem dos ARQUIVOS da previewContainer (que deveria mostrar ARQUIVOS aqui)
    const fileWrappers = previewContainer.querySelectorAll('.preview-wrapper[data-filename]');
    const orderedFiles = [];
    if (fileWrappers.length > 0 && fileWrappers.length === selectedFiles.length) {
        fileWrappers.forEach(wrapper => {
            const filename = wrapper.getAttribute('data-filename');
            const file = selectedFiles.find(f => f.name === filename);
            if (file) orderedFiles.push(file);
        });
        console.log('Merge: Ordem visual dos ARQUIVOS aplicada:', orderedFiles.map(f => f.name));
    } else {
        orderedFiles.push(...selectedFiles); // Fallback para a ordem original de selectedFiles
        console.log('Merge: Fallback para ordem original dos ARQUIVOS:', orderedFiles.map(f => f.name));
    }

    if (orderedFiles.length < 2) {
        hideSpinner('mergeMenu');
        errorMessage2.textContent = '⚠️ Selecione pelo menos 2 arquivos PDF válidos para unir.';
        errorMessage2.style.display = 'block';
        return;
    }
    const formData = new FormData();
    orderedFiles.forEach(file => {
        if (file.type === 'application/pdf') {
            formData.append('files', file, file.name);
        }
    });
    if (formData.getAll('files').length < 2) {
        hideSpinner('mergeMenu');
        errorMessage2.textContent = '⚠️ Pelo menos 2 arquivos PDF válidos são necessários para unir.';
        errorMessage2.style.display = 'block';
        return;
    }

    fetch('/merge', { method: 'POST', body: formData })
    .then(response => {
        if (!response.ok) throw new Error('Erro ao unir PDFs. Código: ' + response.status);
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ZG_unido_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setTimeout(() => { hideSpinner('mergeMenu'); resetApp(); }, 1000); // Reduzido para 1s
    })
    .catch(err => {
        hideSpinner('mergeMenu');
        console.error("Erro no fetch /merge:", err);
        errorMessage.textContent = '⚠️ Erro ao unir os PDFs. ' + err.message;
        errorMessage.style.display = 'block';
    })
    .finally(() => { // Garante que o menu feche e spinner suma
        // closeMergeMenu(); // ResetApp já recarrega a página
    });
});

startSplitBtn.addEventListener('click', async () => {
    showSpinner('splitMenu');
    // ... (lógica do split)
    // Adicionar hideSpinner('splitMenu') nos locais apropriados (erros, success, finally)
    // Exemplo na catch:
    // catch (error) { hideSpinner('splitMenu'); ... }
    // E no finally: hideSpinner('splitMenu');
    // No setTimeout de resetApp:
    // setTimeout(() => { hideSpinner('splitMenu'); resetApp(); }, 1000);

    // Código do startSplitBtn com hideSpinner adicionado
    hideAllErrors();
    if (selectedFiles.length === 0) {
        hideSpinner('splitMenu');
        errorMessage2.textContent = '⚠️ Por favor, selecione pelo menos um arquivo PDF para dividir.';
        errorMessage2.style.display = 'block';
        return;
    }
    const pdfFileToSplit = selectedFiles[0]; // Assumindo que só um arquivo pode ser dividido por vez
    if (pdfFileToSplit.type !== 'application/pdf') {
        hideSpinner('splitMenu');
        errorMessage2.textContent = '⚠️ Apenas arquivos PDF podem ser divididos.';
        errorMessage2.style.display = 'block';
        return;
    }

    const selectedModeBtn = document.querySelector('.mode-btn.active');
    if (!selectedModeBtn) {
        hideSpinner('splitMenu');
        errorMessage2.textContent = '⚠️ Por favor, selecione um modo de divisão.';
        errorMessage2.style.display = 'block';
        return;
    }
    const mode = selectedModeBtn.dataset.mode;
    const formData = new FormData();
    formData.append('pdfs', pdfFileToSplit); // Envia apenas o primeiro arquivo PDF selecionado
    formData.append('mode', mode);

    let numPages = 0;
    try { // Validação de contagem de páginas antes de enviar
        const buffer = await pdfFileToSplit.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(new Uint8Array(buffer)).promise;
        numPages = pdf.numPages;
    } catch (e) {
        hideSpinner('splitMenu');
        errorMessage2.textContent = '⚠️ Erro ao ler o arquivo PDF para validação.';
        errorMessage2.style.display = 'block';
        return;
    }

    if (mode === 'parts') {
        const partsInput = document.getElementById('split-parts-input');
        const parts = parseInt(partsInput.value);
        if (isNaN(parts) || parts < 2) {
            hideSpinner('splitMenu');
            errorMessage2.textContent = '⚠️ Número de partes inválido (mínimo 2).';
            errorMessage2.style.display = 'block';
            return;
        }
        if (parts > numPages) {
            hideSpinner('splitMenu');
            errorMessage2.textContent = `⚠️ O arquivo tem apenas ${numPages} página(s). Não é possível dividir em ${parts} partes.`;
            errorMessage2.style.display = 'block';
            return;
        }
        formData.append('parts', parts);
    } else if (mode === 'size') {
        const sizeInput = document.getElementById('split-size-input');
        const sizeMB = parseFloat(sizeInput.value);
        if (isNaN(sizeMB) || sizeMB < 0.1) {
            hideSpinner('splitMenu');
            errorMessage2.textContent = '⚠️ Tamanho inválido. Informe um valor em MB (mínimo 0.1).';
            errorMessage2.style.display = 'block';
            return;
        }
        formData.append('max_size_mb', sizeMB);
    }

    try {
        const response = await fetch('/split', { method: 'POST', body: formData });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Erro ao dividir PDF. Código: ' + response.status }));
            throw new Error(errorData.message || 'Erro na resposta do servidor ao dividir.');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ZG_dividido_${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setTimeout(() => { resetApp(); }, 1000); // hideSpinner não precisa aqui, pois resetApp recarrega
    } catch (error) {
        console.error('Erro ao dividir PDF:', error);
        errorMessage2.textContent = `⚠️ ${error.message}`;
        errorMessage2.style.display = 'block';
    } finally {
        hideSpinner('splitMenu'); // Garante que o spinner suma
    }
});


startOrganizeBtn.addEventListener('click', async () => {
    showSpinner('organizeMenu'); // Spinner para o menu de organizar
    hideAllErrors();

    if (!pdfDocForOrganize || selectedFiles.length === 0) { // Verifica se o PDF está carregado para organização
        hideSpinner('organizeMenu');
        errorMessage2.textContent = '⚠️ Nenhum arquivo PDF carregado para organizar ou erro interno.';
        errorMessage2.style.display = 'block';
        return;
    }
    const fileToOrganize = selectedFiles[0]; // O arquivo original que foi carregado para organização

    const pageOrder = [];
    // Pega a ordem das PÁGINAS de previewContainer
    const pageWrappers = previewContainer.querySelectorAll('.preview-wrapper[data-page-num]');
    pageWrappers.forEach(wrapper => {
        const pageNum = parseInt(wrapper.dataset.pageNum);
        const rotation = parseInt(wrapper.dataset.rotation) || 0;
        pageOrder.push({ page: pageNum, rotation: rotation });
    });

    if (pageOrder.length === 0) {
        hideSpinner('organizeMenu');
        errorMessage2.textContent = '⚠️ Nenhuma página encontrada para organizar.';
        errorMessage2.style.display = 'block';
        return;
    }

    const formData = new FormData();
    formData.append('pdf', fileToOrganize); // Envia o arquivo original
    formData.append('order', JSON.stringify(pageOrder));
    
    try {
        const response = await fetch('/organize', { method: 'POST', body: formData });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Erro ao organizar PDF. Código: ' + response.status }));
            throw new Error(errorData.message || 'Erro na resposta do servidor ao organizar.');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ZG_organizado_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setTimeout(() => { resetApp(); }, 1000);
    } catch (error) {
        console.error('Erro ao organizar PDF:', error);
        errorMessage2.textContent = `⚠️ ${error.message}`;
        errorMessage2.style.display = 'block';
    } finally {
        hideSpinner('organizeMenu');
        // closeOrganizeMenu(); // ResetApp já recarrega
    }
});

// Lógica para os botões de modo de divisão (parts/size)
modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSplitMode = btn.dataset.mode; // Atualiza o modo selecionado

        if (selectedSplitMode === 'parts') {
            partsOption.style.display = 'block';
            sizeOption.style.display = 'none';
        } else if (selectedSplitMode === 'size') {
            partsOption.style.display = 'none';
            sizeOption.style.display = 'block';
        }
    });
});
// Não feche o splitMenu aqui: o 'closeSplitMenu()' estava no loop errado antes.
// O menu de split deve ser fechado pelo botão 'X' ou após uma ação bem-sucedida.

// --- FUNÇÃO DE RESET ---
function resetApp() {
    console.log('Aplicativo resetando...');
    location.reload();
}