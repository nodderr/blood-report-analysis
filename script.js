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
            
            // --- NEW LOGIC START ---
            // 1. Parse the JSON string received from Python
            const analysisData = JSON.parse(data.analysis);
            
            // 2. Build the Summary HTML
            let htmlContent = `
                <div class="summary-box">
                    <h3>🩺 Summary</h3>
                    <p>${analysisData.summary}</p>
                </div>
            `;

            // 3. Build the Table HTML
            htmlContent += `
                <div class="table-container">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Test Name</th>
                                <th>Value</th>
                                <th>Unit</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            // 4. Loop through results to create rows
            analysisData.results.forEach(item => {
                // Add a class if the status is not Normal
                const statusClass = (item.status === 'High' || item.status === 'Low') ? 'status-warning' : 'status-normal';
                
                htmlContent += `
                    <tr>
                        <td>${item.test_name}</td>
                        <td>${item.value}</td>
                        <td>${item.unit || '-'}</td>
                        <td class="${statusClass}">${item.status}</td>
                    </tr>
                `;
            });

            htmlContent += `
                        </tbody>
                    </table>
                </div>
            `;

            outputDiv.innerHTML = htmlContent;
            // --- NEW LOGIC END ---

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

// --- PHASE 3: Analytics Logic ---
let myChart = null;
let allHistoryData = [];

function showUpload() {
    document.getElementById('uploadSection').classList.remove('hidden');
    document.getElementById('historySection').classList.add('hidden');
}

async function loadHistory() {
    document.getElementById('uploadSection').classList.add('hidden');
    document.getElementById('historySection').classList.remove('hidden');

    try {
        const response = await fetch('/api/history');
        allHistoryData = await response.json();

        if (allHistoryData.length === 0) {
            alert("No history found. Upload a report first!");
            return;
        }

        populateMetricDropdown();
        updateChart(); // Draw default chart

    } catch (error) {
        console.error("Failed to load history:", error);
    }
}

function populateMetricDropdown() {
    const select = document.getElementById('metricSelect');
    const uniqueMetrics = new Set();

    // Look through all reports and find all test names
    allHistoryData.forEach(report => {
        report.results.forEach(item => {
            if (item.test_name && item.value) {
                uniqueMetrics.add(item.test_name);
            }
        });
    });

    select.innerHTML = ""; // Clear existing
    uniqueMetrics.forEach(metric => {
        const option = document.createElement('option');
        option.value = metric;
        option.text = metric;
        select.appendChild(option);
    });
}

function updateChart() {
    const selectedMetric = document.getElementById('metricSelect').value;
    const ctx = document.getElementById('trendChart').getContext('2d');

    // 1. Prepare Data for Chart
    const labels = [];
    const dataPoints = [];

    allHistoryData.forEach(report => {
        // Find the specific metric in this report
        const item = report.results.find(r => r.test_name === selectedMetric);
        
        if (item) {
            labels.push(report.date);
            // Clean the value (remove non-numeric chars like "g/dL")
            const val = parseFloat(item.value.replace(/[^0-9.]/g, ''));
            dataPoints.push(val);
        }
    });

    // 2. Destroy old chart if exists
    if (myChart) {
        myChart.destroy();
    }

    // 3. Create New Chart
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: selectedMetric,
                data: dataPoints,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3 // Smooth curves
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}