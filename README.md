# Blood Report Analyzer

Simple web app using google gemini to analyze your blood reports.

## How to Run

1.  **Clone the repository** (or download the files).
2.  **Install dependencies:**
    ```bash
    pip install flask google-generativeai python-dotenv
    ```
3.  **Set up your API Key:**
    * Create a file named `.env` in the project folder.
    * Add your Google Gemini API key:
        ```text
        GEMINI_API_KEY=your_actual_api_key_here
        ```
4.  **Run the App:**
    ```bash
    python app.py
    ```
5.  **Open in Browser:**
    * Go to: `http://127.0.0.1:5000`

## Built With:
* **Python (Flask)** - Backend
* **HTML / CSS / JS** - Frontend
* **Google Gemini API** - AI