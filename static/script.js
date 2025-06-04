// Variáveis globais
let allFiles = [];
let selectedFiles = [];
let selectedSplitMode = null;
let sortableInstance = null;

// Constantes de elementos do DOM
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('fileInput');
const splitBtn = document.getElementById('split-btn');
const mergeBtn = document.getElementById('merge-btn');
const functionBtn = document.querySelector('.function-btn');
const mergeMenu = document.getElementById('mergeMenu');
const splitMenu = document.getElementById('splitMenu');
const closeBtn = document.querySelector('.close-btn');
const startButton = document.getElementById('start-compression');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const statusMessage = document.getElementById('status-message');
const errorMessage = document.getElementById('error-message');
const errorMessage2 = document.getElementById('error-message2');
const errorMessage3 = document.getElementById('error-message3');
const startMergeBtn = document.getElementById('start-merge');
const startSplitBtn = document.getElementById('start-split');
const previewContainer = document.getElementById('sortable-preview');
const sortMenu = document.getElementById('sort-menu');
const sortAscBtn = document.getElementById('sort-asc-btn');
const sortDescBtn = document.getElementById('sort-desc-btn');
const modeButtons = document.querySelectorAll('.mode-btn');
const partsOption = document.getElementById('parts-option');
const sizeOption = document.getElementById('size-option');
const organizeBtn = document.getElementById('organize-btn');
const organizeMenu = document.getElementById('organizeMenu');
const startOrganizeBtn = document.getElementById('start-organize');
const previewTitle = document.getElementById('preview-title');
const mainButtons = document.getElementById('main-function-buttons');
const organizeButtons = document.getElementById('organize-function-buttons');
const selectAllBtn = document.getElementById('select-all-btn');
const rotateSelectedBtn = document.getElementById('rotate-selected-btn');
const backBtn = document.getElementById('back-btn');
const deselectAllBtn = document.getElementById('deselect-all-btn');

// --- Listeners de Eventos de Upload e Drop ---

// Listener para clique na zona de drop, que simula um clique no input de arquivo
dropZone.addEventListener('click', () => fileInput.click());

// Listener para arrastar arquivos sobre a zona de drop, muda o estilo
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.backgroundColor = '#d7e5f5';
});

// Listener para sair da zona de drop, restaura o estilo
dropZone.addEventListener('dragleave', () => {
    dropZone.style.backgroundColor = '';
});

// Listener para soltar arquivos na zona de drop, processa os arquivos
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.backgroundColor = '';
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        handleFiles(files);
    }
});

// Listener para mudança no input de arquivo (seleção manual), processa os arquivos
fileInput.addEventListener('change', () => {
    const files = fileInput.files;
    if (files.length > 0) {
        handleFiles(files);
    }
});

// --- Funções Auxiliares Comuns ---

// Esconde todas as mensagens de erro
function hideAllErrors() {
    errorMessage.style.display = 'none';
    errorMessage2.style.display = 'none';
    errorMessage3.style.display = 'none';
}

// Exibe o menu de ordenação
document.getElementById("sort-icon").addEventListener("click", function () {
    const menu = document.getElementById("sort-menu");
    menu.style.display = menu.style.display === "none" ? "block" : "none";
});

// Fecha o menu de ordenação ao clicar fora
document.addEventListener("click", function (event) {
    const menu = document.getElementById("sort-menu");
    const icon = document.getElementById("sort-icon");

    if (!menu.contains(event.target) && event.target !== icon) {
        menu.style.display = "none";
    }
});

// Verifica se um nome é numérico
function isNumericName(name) {
    return /^\d+$/.test(name.split('.').shift());
}

// Reconstroi e atualiza as pré-visualizações
async function rebuildPreviews() {
    previewContainer.innerHTML = '';

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        await createPreview(file, i);
    }

    updatePreviewIndices();
    updateMergeButtonState();
    checkPreviewVisibility();

    if (sortableInstance) sortableInstance.destroy();
    sortableInstance = Sortable.create(previewContainer, {
        animation: 150,
        ghostClass: 'sortable-ghost',
    });
}

// Cria uma pré-visualização de um arquivo PDF
function createPreview(file, index) {
    return new Promise((resolve) => {
        const fileReader = new FileReader();
        fileReader.onload = async function () {
            const typedarray = new Uint8Array(this.result);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.4 });

            const wrapper = document.createElement('div');
            wrapper.classList.add('preview-wrapper');
            wrapper.setAttribute('data-index', index);
            wrapper.setAttribute('data-filename', file.name);

            const canvas = document.createElement('canvas');
            canvas.classList.add('preview-canvas');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const context = canvas.getContext('2d');
            await page.render({ canvasContext: context, viewport }).promise;

            const removeBtn = document.createElement('button');
            removeBtn.textContent = '×';
            removeBtn.classList.add('remove-btn');
            removeBtn.title = 'Remover arquivo';

            // Listener para remover arquivo da pré-visualização
            removeBtn.addEventListener('click', () => {
                previewContainer.removeChild(wrapper);

                const idx = selectedFiles.findIndex(f => f.name === file.name);
                if (idx !== -1) {
                    selectedFiles.splice(idx, 1);
                }

                if (selectedFiles.length === 0) {
                    location.reload();
                } else {
                    rebuildPreviews();
                }
            });

            const fileName = document.createElement('p');
            fileName.textContent = file.name;
            fileName.classList.add('file-name');

            wrapper.appendChild(fileName);
            wrapper.appendChild(canvas);
            wrapper.appendChild(removeBtn);
            previewContainer.appendChild(wrapper);

            resolve();
        };
        fileReader.readAsArrayBuffer(file);
    });
}

// Processa arquivos selecionados, gera previews e atualiza botões
async function handleFiles(files) {
    hideAllErrors();

    const newFiles = Array.from(files);

    newFiles.forEach(file => {
        if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
            selectedFiles.push(file);
            checkPreviewVisibility();
        }
    });

    document.getElementById('preview-container-grid').style.display = 'block';

    for (let i = selectedFiles.length - newFiles.length; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        await createPreview(file, i);
    }

    if (sortableInstance) sortableInstance.destroy();
    sortableInstance = Sortable.create(previewContainer, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onSort: () => {
            // Callback após a ordenação
        }
    });

    updateMergeButtonState();
    checkPreviewVisibility();
}

// Habilita ou desabilita o botão "Unir PDFs"
function updateMergeButtonState() {
    if (previewContainer.children.length > 0) {
        startMergeBtn.disabled = false;
        errorMessage2.style.display = 'none';
    } else {
        startMergeBtn.disabled = true;
    }
}

// Abre o menu lateral de merge
function openMergeMenu() {
    hideAllErrors();
    mergeMenu.style.right = '0';
}

// Fecha o menu lateral de merge
function closeMergeMenu() {
    mergeMenu.style.right = '-600px';
}

// Abre o menu lateral de split
function openSplitMenu() {
    hideAllErrors();
    splitMenu.style.right = '0';
}

// Fecha o menu lateral de split
function closeSplitMenu() {
    splitMenu.style.right = '-600px';
}

// Abre o menu lateral de organizar
function openOrganizeMenu() {
    hideAllErrors();
    organizeMenu.style.right = '0';
    document.getElementById('sort-icon').style.display = 'none';
    document.getElementById('sort-menu').style.display = 'none';
    previewTitle.textContent = 'Organize as páginas na ordem desejada:';
}

// Fecha o menu lateral de organizar
function closeOrganizeMenu() {
    organizeMenu.style.right = '-600px';
}

// Reseta o aplicativo
function resetApp() {
    location.reload();
}

// Atualiza os índices das pré-visualizações
function updatePreviewIndices() {
    const previews = previewContainer.querySelectorAll('.preview-wrapper');
    previews.forEach((prev, newIndex) => {
        prev.setAttribute('data-index', newIndex);
    });
}

// Verifica a visibilidade do contêiner de pré-visualização
function checkPreviewVisibility() {
    const containerGrid = document.getElementById('preview-container-grid');
    if (selectedFiles.length === 0) {
        containerGrid.style.display = 'none';
    } else {
        containerGrid.style.display = 'block';
    }
}

// Exibe o spinner de carregamento
function showSpinner() {
    document.querySelectorAll('#mergeMenu #loading-spinner, #splitMenu #loading-spinner').forEach(spinner => {
        spinner.classList.remove('hidden');
    });
}

// Esconde o spinner de carregamento
function hideSpinner() {
    document.querySelectorAll('#mergeMenu #loading-spinner, #splitMenu #loading-spinner').forEach(spinner => {
        spinner.classList.add('hidden');
    });
}

// --- Listeners de Eventos de Navegação e Menus ---

// Listener para selecionar modo de divisão
document.querySelectorAll('input[name="split-mode"]').forEach((radio) => {
    radio.addEventListener('change', () => {
        const mode = document.querySelector('input[name="split-mode"]:checked').value;
        document.getElementById('parts-option').style.display = mode === 'parts' ? 'block' : 'none';
        document.getElementById('size-option').style.display = mode === 'size' ? 'block' : 'none';
    });
});

// Listener para o botão de fechar menus
closeBtn.addEventListener('click', () => {
    closeMergeMenu();
    closeSplitMenu();
    hideAllErrors();
});

// Listener para o botão Split
splitBtn.addEventListener('click', () => {
    hideAllErrors();

    if (selectedFiles.length === 0) {
        errorMessage2.textContent = '⚠️ Por favor, selecione um arquivo para dividir.';
        errorMessage2.style.display = "block";
    } else if (selectedFiles.length > 1) {
        errorMessage2.textContent = '⚠️ Por favor, selecione apenas um arquivo para dividir.';
        errorMessage2.style.display = "block";
    } else {
        openSplitMenu();
        closeMergeMenu();
    }
});

// Listener para o botão Merge
mergeBtn.addEventListener('click', () => {
    hideAllErrors();
    if (selectedFiles.length < 2) {
        errorMessage3.textContent = '⚠️ Selecione pelo menos 2 arquivos para unir.';
        errorMessage3.style.display = "block";
    } else {
        openMergeMenu();
        closeSplitMenu();
    }
});

// Listener para o botão Organize
organizeBtn.addEventListener('click', () => {
    hideAllErrors();
    fileInput.disabled = true;
    dropZone.classList.add('disabled-upload');

    if (selectedFiles.length === 0) {
        errorMessage2.textContent = '⚠️ Por favor, selecione um arquivo para organizar.';
        errorMessage2.style.display = "block";
    } else if (selectedFiles.length > 1) {
        errorMessage2.textContent = '⚠️ Por favor, selecione um arquivo por vez para organizar.';
        errorMessage2.style.display = "block";
    } else {
        document.getElementById('main-function-buttons').style.display = 'none';
        document.getElementById('organize-function-buttons').style.display = 'flex';
        generateOrganizePreviews();
        openOrganizeMenu();
    }
});

// Listener para o botão Voltar
backBtn.addEventListener('click', () => {
    resetApp();
});

// --- Funcionalidade de União (Merge) ---

// Listener para o botão iniciar união
startMergeBtn.addEventListener('click', () => {
    showSpinner();
    hideAllErrors();

    if (selectedFiles.length === 0) {
        hideSpinner();
        errorMessage2.textContent = '⚠️ Por favor, selecione arquivos antes de tentar unir.';
        errorMessage2.style.display = 'block';
        return;
    }

    const wrappers = previewContainer.querySelectorAll('.preview-wrapper');
    const orderedFiles = [];

    if (wrappers.length && [...wrappers].every(w => w.hasAttribute('data-filename'))) {
        wrappers.forEach(wrapper => {
            const filename = wrapper.getAttribute('data-filename');
            const file = selectedFiles.find(f => f.name === filename);
            if (file) orderedFiles.push(file);
        });
    } else {
        orderedFiles.push(...selectedFiles);
    }

    if (orderedFiles.length < 2) {
        hideSpinner();
        errorMessage2.textContent = '⚠️ Selecione pelo menos 2 arquivos para realizar a união.';
        errorMessage2.style.display = 'block';
        return;
    }

    const formData = new FormData();
    orderedFiles.forEach(file => {
        formData.append('files', file, file.name);
    });

    fetch('/merge', {
        method: 'POST',
        body: formData,
    })
    .then(response => {
        if (!response.ok) throw new Error('Erro ao unir PDFs');
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedFiles[0].name}_unido.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setTimeout(() => {
            resetApp();
        }, 3000);
    })
    .catch(err => {
        hideSpinner();
        console.error(err);
        alert('Erro ao unir PDFs.');
    });

    closeMergeMenu();
});

// --- Funcionalidade de Divisão (Split) ---

// Listener para o botão iniciar divisão
startSplitBtn.addEventListener('click', async () => {
    hideAllErrors();
    showSpinner();

    if (selectedFiles.length === 0) {
        hideSpinner();
        errorMessage2.textContent = '⚠️ Por favor, selecione pelo menos um arquivo para dividir.';
        errorMessage2.style.display = 'block';
        return;
    }

    const selectedModeBtn = document.querySelector('.mode-btn.active');
    if (!selectedModeBtn) {
        hideSpinner();
        errorMessage2.textContent = '⚠️ Por favor, selecione um modo de divisão.';
        errorMessage2.style.display = 'block';
        return;
    }
    const mode = selectedModeBtn.dataset.mode;
    const formData = new FormData();

    for (let file of selectedFiles) {
        formData.append('pdfs', file);
    }

    formData.append('mode', mode);

    if (mode === 'parts') {
        const partsInput = document.getElementById('split-parts-input');
        const parts = parseInt(partsInput.value);

        if (isNaN(parts) || parts < 2) {
            hideSpinner();
            errorMessage2.textContent = '⚠️ Número de partes inválido.';
            errorMessage2.style.display = 'block';
            return;
        }

        for (let file of selectedFiles) {
            try {
                const buffer = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsArrayBuffer(file);
                });

                const pdf = await pdfjsLib.getDocument(new Uint8Array(buffer)).promise;
                const numPages = pdf.numPages;

                if (parts > numPages) {
                    hideSpinner();
                    errorMessage2.textContent = `⚠️ O arquivo "${file.name}" tem apenas ${numPages} página(s). Não é possível dividir em ${parts} partes.`;
                    errorMessage2.style.display = 'block';
                    return;
                }
            } catch (e) {
                hideSpinner();
                console.error(`Erro ao processar o arquivo "${file.name}":`, e);
                errorMessage2.textContent = `⚠️ Erro ao processar o arquivo "${file.name}".`;
                errorMessage2.style.display = 'block';
                return;
            }
        }

        formData.append('parts', parts);
    } else if (mode === 'size') {
        const sizeInput = document.getElementById('split-size-input');
        const sizeMB = parseFloat(sizeInput.value);

        if (isNaN(sizeMB) || sizeMB < 0.1) {
            hideSpinner();
            errorMessage2.textContent = '⚠️ Tamanho inválido. Informe um valor em MB (mínimo 0.1).';
            errorMessage2.style.display = 'block';
            return;
        }

        formData.append('max_size_mb', sizeMB);
    }

    try {
        const response = await fetch('/split', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Erro na resposta do servidor.');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'split_result.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setTimeout(() => {
            resetApp();
        }, 3000);
    } catch (error) {
        console.error('Erro ao dividir PDF:', error);
        errorMessage2.textContent = '⚠️ Ocorreu um erro ao dividir o PDF.';
        errorMessage2.style.display = 'block';
    } finally {
        hideSpinner();
    }
});

// Listener para alternar modo de divisão
modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (btn.dataset.mode === 'parts') {
            partsOption.style.display = 'block';
            sizeOption.style.display = 'none';
        } else if (btn.dataset.mode === 'size') {
            partsOption.style.display = 'none';
            sizeOption.style.display = 'block';
        }
    });
});

// Listener para atualização do modo de divisão e fechamento do menu
modeButtons.forEach(button => {
    button.addEventListener('click', () => {
        selectedSplitMode = button.getAttribute('data-mode');

        modeButtons.forEach(btn => btn.classList.remove('active-mode'));
        button.classList.add('active-mode');

        if (selectedSplitMode === 'parts') {
            partsOption.style.display = 'block';
            sizeOption.style.display = 'none';
        } else if (selectedSplitMode === 'size') {
            sizeOption.style.display = 'block';
            partsOption.style.display = 'none';
        }
    });
    closeSplitMenu();
});

// --- Funcionalidade de Organização (Organize) ---

// Gera pré-visualizações de páginas para organização
async function generateOrganizePreviews() {
    const file = selectedFiles[0];
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    previewContainer.innerHTML = '';

    // Renderiza uma página PDF no canvas com rotação
    async function renderPage(canvas, page, scale, rotation) {
        const viewport = page.getViewport({ scale: scale, rotation: rotation });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        await page.render({ canvasContext: context, viewport }).promise;
    }

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const canvas = document.createElement('canvas');
        await renderPage(canvas, page, 0.5, 0);

        const wrapper = document.createElement('div');
        wrapper.classList.add('preview-wrapper');
        wrapper.dataset.pageNum = pageNum;
        wrapper.dataset.rotation = 0;

        // Listener para selecionar/desselecionar página
        wrapper.addEventListener('click', (e) => {
            if (e.target.classList.contains('rotate-btn')) return;
            wrapper.classList.toggle('selected');
        });

        const pageNumber = document.createElement('div');
        pageNumber.classList.add('page-number');
        pageNumber.textContent = `${pageNum}`;
        wrapper.appendChild(pageNumber);

        const rotateBtn = document.createElement('button');
        rotateBtn.textContent = '⟳';
        rotateBtn.classList.add('rotate-btn');
        // Listener para girar página individualmente
        rotateBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            let currentRotation = parseInt(wrapper.dataset.rotation) || 0;
            currentRotation = (currentRotation + 90) % 360;
            wrapper.dataset.rotation = currentRotation;
            await renderPage(canvas, page, 0.5, currentRotation);
        });

        wrapper.appendChild(canvas);
        wrapper.appendChild(rotateBtn);
        previewContainer.appendChild(wrapper);
    }

    Sortable.create(previewContainer, {
        animation: 150,
        ghostClass: 'sortable-ghost'
    });

    document.getElementById('preview-container-grid').style.display = 'block';
}

// Listener para o botão iniciar organização
startOrganizeBtn.addEventListener('click', async () => {
    hideAllErrors();
    showSpinner();

    const file = selectedFiles[0];
    const pageOrder = [];
    Array.from(previewContainer.children).forEach(div => {
        const pageNum = parseInt(div.dataset.pageNum);
        const rotation = parseInt(div.dataset.rotation) || 0;
        pageOrder.push({ page: pageNum, rotation: rotation });
    });

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('order', JSON.stringify(pageOrder));

    try {
        const response = await fetch('/organize', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Erro na resposta do servidor.');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'organized.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setTimeout(() => {
            resetApp();
        }, 3000);
    } catch (error) {
        console.error('Erro ao organizar PDF:', error);
        errorMessage2.textContent = '⚠️ Ocorreu um erro ao organizar o PDF.';
        errorMessage2.style.display = 'block';
    } finally {
        hideSpinner();
        closeOrganizeMenu();
    }
});

// Limpa seleções de página
function clearPageSelections() {
    const wrappers = document.querySelectorAll('.preview-wrapper');
    wrappers.forEach(wrapper => {
        wrapper.classList.remove('selected');
    });
}

// Habilita seleção de página (com evento duplicado, verificar)
function enablePageSelection() {
    selectedWrappers = [];
    const wrappers = previewContainer.querySelectorAll('.preview-wrapper');
    wrappers.forEach((wrapper, index) => {
        wrapper.onclick = () => {
            wrapper.classList.toggle('selected');
            if (wrapper.classList.contains('selected')) {
                selectedWrappers.push(wrapper);
            } else {
                selectedWrappers = selectedWrappers.filter(w => w !== wrapper);
            }
            displayPageNumber(wrapper, index + 1);
        };
        displayPageNumber(wrapper, index + 1);
    });
}

// Exibe o número da página
function displayPageNumber(wrapper, pageNum) {
    let badge = wrapper.querySelector('.page-number');
    if (!badge) {
        badge = document.createElement('div');
        badge.classList.add('page-number');
        wrapper.appendChild(badge);
    }
    badge.textContent = `Página ${pageNum}`;
}

// Listener para desselecionar todas as páginas
deselectAllBtn.addEventListener('click', () => {
    const wrappers = previewContainer.querySelectorAll('.preview-wrapper');
    wrappers.forEach(wrapper => {
        wrapper.classList.remove('selected');
    });
    // Limpa a variável de seleções
    selectedWrappers = [];
});

// Listener para selecionar todas as páginas
selectAllBtn.addEventListener('click', () => {
    const wrappers = previewContainer.querySelectorAll('.preview-wrapper');
    wrappers.forEach(wrapper => {
        wrapper.classList.add('selected');
    });
    errorMessage2.style.display = 'none';
    selectedWrappers = Array.from(wrappers);
});

// Listener para desselecionar todas as páginas (verificar duplicação)
deselectAllBtn.addEventListener('click', () => {
    const wrappers = previewContainer.querySelectorAll('.preview-wrapper');

    if (selectedWrappers.length === 0) {
        errorMessage2.textContent = '⚠️ Não há nenhuma página selecionada.';
        errorMessage2.style.display = "block";
    }

    wrappers.forEach(wrapper => {
        wrapper.classList.remove('selected');
    });
    selectedWrappers = [];
});

// Listener para girar páginas selecionadas
rotateSelectedBtn.addEventListener('click', async () => {
    const selectedWrappers = document.querySelectorAll('.preview-wrapper.selected');

    if (selectedWrappers.length === 0) {
        errorMessage2.textContent = '⚠️ Por favor, selecione ao menos uma página para girar.';
        errorMessage2.style.display = "block";
    }

    const file = selectedFiles[0];
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    for (const wrapper of selectedWrappers) {
        const canvas = wrapper.querySelector('canvas');
        const pageNum = parseInt(wrapper.dataset.pageNum);
        let rotation = parseInt(wrapper.dataset.rotation) || 0;
        rotation = (rotation + 90) % 360;
        wrapper.dataset.rotation = rotation;

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 0.5, rotation: rotation });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    }
});

// Listener para ordenar arquivos crescentemente
sortAscBtn.addEventListener('click', async () => {
    sortMenu.style.display = 'none';

    selectedFiles.sort((a, b) => {
        const nameA = a.name.split('.').shift();
        const nameB = b.name.split('.').shift();
        if (isNumericName(nameA) && isNumericName(nameB)) {
            return Number(nameA) - Number(nameB);
        }
        return nameA.localeCompare(nameB);
    });

    await rebuildPreviews();
});

// Listener para ordenar arquivos decrescentemente
sortDescBtn.addEventListener('click', async () => {
    sortMenu.style.display = 'none';

    selectedFiles.sort((a, b) => {
        const nameA = a.name.split('.').shift();
        const nameB = b.name.split('.').shift();
        if (isNumericName(nameA) && isNumericName(nameB)) {
            return Number(nameB) - Number(nameA);
        }
        return nameB.localeCompare(nameA);
    });

    await rebuildPreviews();
});