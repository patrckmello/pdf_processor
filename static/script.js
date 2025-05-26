let allFiles = [];
let selectedFiles = [];  
let selectedCompression = null;
let sortableInstance = null;

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

// Função para esconder todas mensagens de erro para evitar sobreposição
function hideAllErrors() {
    errorMessage.style.display = 'none';
    errorMessage2.style.display = 'none';
    errorMessage3.style.display = 'none';
}

// Função que trata os arquivos selecionados, gera previews e atualiza botões
async function handleFiles(files) {
    hideAllErrors();

    const newFiles = Array.from(files);

    // Impede arquivos duplicados
    newFiles.forEach(file => {
        if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
            selectedFiles.push(file);
        }
    });

    document.getElementById('preview-container-grid').style.display = 'block';

    for (let i = selectedFiles.length - newFiles.length; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileReader = new FileReader();

        await new Promise((resolve) => {
            fileReader.onload = async function () {
                const typedarray = new Uint8Array(this.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 0.4 });

                const wrapper = document.createElement('div');
                wrapper.classList.add('preview-wrapper');
                wrapper.setAttribute('data-index', i);

                const canvas = document.createElement('canvas');
                canvas.classList.add('preview-canvas');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const context = canvas.getContext('2d');
                await page.render({ canvasContext: context, viewport }).promise;

                // Botão de remover
                const removeBtn = document.createElement('button');
                removeBtn.textContent = '×';
                removeBtn.classList.add('remove-btn');
                removeBtn.title = 'Remover arquivo';

                removeBtn.addEventListener('click', () => {
                    const index = parseInt(wrapper.getAttribute('data-index'));
                    previewContainer.removeChild(wrapper);
                    selectedFiles.splice(index, 1);
                    updatePreviewIndices();
                    updateMergeButtonState();
                    checkPreviewVisibility();
                });

                wrapper.appendChild(canvas);
                wrapper.appendChild(removeBtn);
                previewContainer.appendChild(wrapper);

                resolve();
            };
            fileReader.readAsArrayBuffer(file);
        });
    }

    if (sortableInstance) sortableInstance.destroy();
    sortableInstance = Sortable.create(previewContainer, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onSort: () => {
            // opcional
        }
    });

    updateMergeButtonState();
    checkPreviewVisibility();
}

// Habilita ou desabilita botão "Unir PDFs" conforme previews
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

function resetApp() {
    // Limpar arquivos selecionados
    selectedFiles = [];
    fileInput.value = ''; // limpa input de arquivo

    // Limpar preview
    previewContainer.innerHTML = '';
    document.getElementById('preview-container-grid').style.display = 'none';

    // Desabilitar botões que dependem de arquivos
    startMergeBtn.disabled = true;
    startSplitBtn.disabled = true;

    // Esconder menus
    closeMergeMenu();
    closeSplitMenu();

    // Limpar mensagens de erro
    hideAllErrors();

    // Resetar inputs específicos (exemplo: número de partes para split)
    const partsInput = document.getElementById('split-parts-input');
    if(partsInput) partsInput.value = '';

    console.log('Aplicativo resetado após download e cooldown.');
}

function updatePreviewIndices() {
    const previews = previewContainer.querySelectorAll('.preview-wrapper');
    previews.forEach((prev, newIndex) => {
        prev.setAttribute('data-index', newIndex);
    });
}

function checkPreviewVisibility() {
    const containerGrid = document.getElementById('preview-container-grid');
    if (selectedFiles.length === 0) {
        containerGrid.style.display = 'none';
    } else {
        containerGrid.style.display = 'block';
    }
}

// Fechar os menus ao clicar no botão fechar
closeBtn.addEventListener('click', () => {
    closeMergeMenu();
    closeSplitMenu();
    hideAllErrors();
});

splitBtn.addEventListener('click', () => {
    hideAllErrors();
    if (selectedFiles.length === 0) {
        errorMessage2.textContent = '⚠️ Por favor, selecione pelo menos um arquivo para dividir.';
        errorMessage2.style.display = "block";
    } else {
        openSplitMenu();
        closeMergeMenu();
    }
});

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

startMergeBtn.addEventListener('click', () => {
    hideAllErrors();

    if (selectedFiles.length === 0) {
        errorMessage2.textContent = '⚠️ Por favor, selecione arquivos antes de tentar unir.';
        errorMessage2.style.display = 'block';
        console.log('Nenhum arquivo selecionado.');
        return;
    }

    const wrappers = previewContainer.querySelectorAll('.preview-wrapper');
    const orderedFiles = [];

    wrappers.forEach(wrapper => {
        const idx = parseInt(wrapper.getAttribute('data-index'));
        console.log('Canvas data-index:', idx);

        if (!isNaN(idx)) {
            const file = selectedFiles[idx];
            console.log('Arquivo correspondente:', file?.name);

            if (file) {
                orderedFiles.push(file);
            }
        }
    });

    console.log('Arquivos selecionados para unir:', orderedFiles);

    if (orderedFiles.length < 2) {
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
        console.error(err);
        alert('Erro ao unir PDFs.');
    });

    closeMergeMenu();
});

startSplitBtn.addEventListener('click', async () => {
    hideAllErrors();

    const partsInput = document.getElementById('split-parts-input');
    const parts = parseInt(partsInput.value);

    if (selectedFiles.length === 0) {
        errorMessage2.textContent = '⚠️ Por favor, selecione pelo menos um arquivo para dividir.';
        errorMessage2.style.display = 'block';
        return;
    }

    if (isNaN(parts) || parts < 2) {
        errorMessage2.textContent = '⚠️ Número de partes inválido.';
        errorMessage2.style.display = 'block';
        return;
    }

    // Validação: verificar se o número de partes excede o número de páginas
    for (let file of selectedFiles) {
        const fileReader = new FileReader();
        const buffer = await new Promise(resolve => {
            fileReader.onload = () => resolve(fileReader.result);
            fileReader.readAsArrayBuffer(file);
        });

        try {
            const pdf = await pdfjsLib.getDocument(new Uint8Array(buffer)).promise;
            const numPages = pdf.numPages;

            if (parts > numPages) {
                errorMessage2.textContent = `⚠️ O arquivo "${file.name}" tem apenas ${numPages} página(s). Não é possível dividir em ${parts} partes.`;
                errorMessage2.style.display = 'block';
                return;
            }
        } catch (e) {
            console.error(`Erro ao ler o PDF "${file.name}":`, e);
            errorMessage2.textContent = `⚠️ Erro ao processar o arquivo "${file.name}".`;
            errorMessage2.style.display = 'block';
            return;
        }
    }

    const formData = new FormData();
    selectedFiles.forEach(file => formData.append('files', file));
    formData.append('parts', parts);

    fetch('/split', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro ao dividir o PDF');
        }
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'divididos.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setTimeout(() => {
            resetApp();
        }, 3000);
})
    })
    .catch(error => {
        console.error('Erro:', error);
        errorMessage2.textContent = '⚠️ Ocorreu um erro ao dividir os arquivos.';
        errorMessage2.style.display = 'block';
    });

