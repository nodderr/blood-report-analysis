// --- Drag and Drop Logic ---
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('fileInput');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
    dropArea.classList.add('highlight');
}

function unhighlight(e) {
    dropArea.classList.remove('highlight');
}

dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    fileInput.files = files;
    handleFiles(files);
}

fileInput.addEventListener('change', function() {
    handleFiles(this.files);
});

// --- Preview Logic ---
function handleFiles(files) {
    if (files.length > 0) {
        const file = files[0];
        const previewContainer = document.getElementById('previewContainer');
        const filePreview = document.getElementById('filePreview');
        const fileName = document.getElementById('fileName');

        fileName.textContent = file.name;
        previewContainer.classList.remove('hidden');

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = function() {
                filePreview.src = reader.result;
                filePreview.classList.remove('hidden');
            }
        } else {
            filePreview.classList.add('hidden');
        }
    }
}

// --- Analysis Logic ---
async function analyzeReport() {
    const outputDiv = document.getElementById('output');
    const loadingDiv = document.getElementById('loading');
    const resultSection = document.getElementById('resultSection');

    if (fileInput.files.length === 0) {
        alert("Please select a file first!");
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    loadingDiv.classList.remove('hidden');
    resultSection.classList.add('hidden');
    outputDiv.innerHTML = ""; 

    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        loadingDiv.classList.add('hidden');
        
        if (response.ok) {
            resultSection.classList.remove('hidden');
            outputDiv.innerHTML = marked.parse(data.analysis);
            resultSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            alert("Error: " + data.error);
        }

    } catch (error) {
        loadingDiv.classList.add('hidden');
        alert("Something went wrong with the connection.");
        console.error("Error:", error);
    }
}

// --- Copy to Clipboard ---
function copyToClipboard() {
    const text = document.getElementById('output').innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert("Summary copied to clipboard!");
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

// --- Download Report (Native Print) ---
function downloadReport() {
    window.print();
}

// --- Dark Mode Toggle ---
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const btn = document.getElementById('themeToggle');
    if (document.body.classList.contains('dark-mode')) {
        btn.textContent = "☀️ Light Mode";
    } else {
        btn.textContent = "🌙 Dark Mode";
    }
}