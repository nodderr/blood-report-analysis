async function analyzeReport() {
    const fileInput = document.getElementById('fileInput');
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
            
            const formattedText = data.analysis.replace(/\n/g, '<br>');
            outputDiv.innerHTML = marked.parse(data.analysis);
        } else {
            alert("Error: " + data.error);
        }

    } catch (error) {
        loadingDiv.classList.add('hidden');
        alert("Something went wrong with the connection.");
        console.error("Error:", error);
    }
}