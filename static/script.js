let allFiles = [];
let selectedFiles = [];  
let selectedSplitMode = null;
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
const sortMenu = document.getElementById('sort-menu');
const sortAscBtn = document.getElementById('sort-asc-btn');
const sortDescBtn = document.getElementById('sort-desc-btn');
const modeButtons = document.querySelectorAll('.mode-btn');
const partsOption = document.getElementById('parts-option');
const sizeOption = document.getElementById('size-option');

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

document.getElementById("sort-icon").addEventListener("click", function () {
    const menu = document.getElementById("sort-menu");
    menu.style.display = menu.style.display === "none" ? "block" : "none";
  });

  // Opcional: fecha o menu ao clicar fora dele
  document.addEventListener("click", function (event) {
    const menu = document.getElementById("sort-menu");
    const icon = document.getElementById("sort-icon");

    if (!menu.contains(event.target) && event.target !== icon) {
      menu.style.display = "none";
    }
  });

function isNumericName(name) {
    return /^\d+$/.test(name.split('.').shift());
}

sortAscBtn.addEventListener('click', async () => {
    console.log('Ordenar crescente');
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

sortDescBtn.addEventListener('click', async () => {
    console.log('Ordenar decrescente');
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

async function rebuildPreviews() {
    console.log('Reconstruindo previews...');
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

            removeBtn.addEventListener('click', () => {
                // Remover preview e arquivo do array
                previewContainer.removeChild(wrapper);
                const idx = selectedFiles.findIndex(f => f.name === file.name);
                if (idx !== -1) {
                    selectedFiles.splice(idx, 1);
                }
                rebuildPreviews(); // Reconstruir para atualizar índices
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
    location.reload();

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

function showSpinner() {
  document.querySelectorAll('#mergeMenu #loading-spinner, #splitMenu #loading-spinner').forEach(spinner => {
    spinner.classList.remove('hidden');
  });
}

function hideSpinner() {
  document.querySelectorAll('#mergeMenu #loading-spinner, #splitMenu #loading-spinner').forEach(spinner => {
    spinner.classList.add('hidden');
  });
}

document.querySelectorAll('input[name="split-mode"]').forEach((radio) => {
    radio.addEventListener('change', () => {
        const mode = document.querySelector('input[name="split-mode"]:checked').value;
        document.getElementById('parts-option').style.display = mode === 'parts' ? 'block' : 'none';
        document.getElementById('size-option').style.display = mode === 'size' ? 'block' : 'none';
    });
});

// Fechar os menus ao clicar no botão fechar
closeBtn.addEventListener('click', () => {
    closeMergeMenu();
    closeSplitMenu();
    hideAllErrors();
});

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
    showSpinner();
    hideAllErrors();

    if (selectedFiles.length === 0) {
        hideSpinner();
        errorMessage2.textContent = '⚠️ Por favor, selecione arquivos antes de tentar unir.';
        errorMessage2.style.display = 'block';
        console.log('Nenhum arquivo selecionado.');
        return;
    }

    const wrappers = previewContainer.querySelectorAll('.preview-wrapper');
    const orderedFiles = [];

    wrappers.forEach(wrapper => {
        const filename = wrapper.getAttribute('data-filename');
        const file = selectedFiles.find(f => f.name === filename);
        if (file) orderedFiles.push(file);
    });


    console.log('Arquivos selecionados para unir:', orderedFiles);

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

        // Validação de páginas
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
    } catch (error) {
        console.error('Erro ao dividir PDF:', error);
        errorMessage2.textContent = '⚠️ Ocorreu um erro ao dividir o PDF.';
        errorMessage2.style.display = 'block';
    } finally {
        hideSpinner();
    }
});

modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove active de todos
    modeButtons.forEach(b => b.classList.remove('active'));
    // Ativa o clicado
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

modeButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Atualiza o modo selecionado
        selectedSplitMode = button.getAttribute('data-mode');

        // Remove o estilo ativo de todos e aplica no selecionado
        modeButtons.forEach(btn => btn.classList.remove('active-mode'));
        button.classList.add('active-mode');

        // Mostra o campo correspondente
        if (selectedSplitMode === 'parts') {
            partsOption.style.display = 'block';
            sizeOption.style.display = 'none';
        } else if (selectedSplitMode === 'size') {
            sizeOption.style.display = 'block';
            partsOption.style.display = 'none';
        }
    });
});