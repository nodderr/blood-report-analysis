import os
import json
from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import google.generativeai as genai
from dotenv import load_dotenv

from collections import defaultdict

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=api_key)

app = Flask(__name__, template_folder='.', static_folder='.', static_url_path='')

# --- DATABASE CONFIGURATION START ---
# We are using SQLite. It creates a simple file named 'blood_reports.db'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///blood_reports.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Define the "Report" Model
class Report(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.DateTime, default=datetime.now) # Timestamp
    summary = db.Column(db.Text)                        # The text summary
    raw_data = db.Column(db.JSON)                       # The full JSON data (for graphing later)

# Create the database tables if they don't exist
with app.app_context():
    db.create_all()
# --- DATABASE CONFIGURATION END ---

SYSTEM_PROMPT = """
You are a medical assistant. Analyze the blood report image and return the output strictly in JSON format. 
Do not return Markdown or plain text. Use this specific schema:

{
  "summary": "A brief, reassuring summary of the report in simple language (string).",
  "results": [
    {
      "test_name": "Name of the test (e.g., Hemoglobin)",
      "value": "The numeric value or string result",
      "unit": "The unit (e.g., g/dL)",
      "status": "Normal, High, or Low",
      "reference_range": "The normal range mentioned (optional)"
    }
  ]
}
"""



@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        file_data = file.read()

        model = genai.GenerativeModel(
            'gemini-3-flash-preview', 
            generation_config={"response_mime_type": "application/json"}
        )

        response = model.generate_content([
            SYSTEM_PROMPT,
            {"mime_type": file.content_type, "data": file_data}
        ])

        # --- SAVING LOGIC START ---
        # 1. Parse the JSON string from Gemini into a Python Dictionary
        analysis_dict = json.loads(response.text)

        # 2. Create a new Report object
        new_report = Report(
            summary=analysis_dict.get('summary', 'No summary provided'),
            raw_data=analysis_dict  # Save the whole structure for Phase 3
        )

        # 3. Add to session and commit (save) to database
        db.session.add(new_report)
        db.session.commit()
        print(f"Report saved with ID: {new_report.id}") # Debug print
        # --- SAVING LOGIC END ---

        return jsonify({'analysis': response.text})

    except Exception as e:
        print(f"Error: {e}") # Print error to terminal for debugging
        return jsonify({'error': str(e)}), 500

# New Route to check if it's working (Optional)
@app.route('/history')
def history():
    reports = Report.query.order_by(Report.date.desc()).all()
    # Simple text dump to verify data is saving
    return "<br>".join([f"ID: {r.id} | Date: {r.date} | Summary: {r.summary}" for r in reports])

# --- PHASE 3: Analytics Endpoint ---
@app.route('/api/history')
def get_history_data():
    # Get all reports sorted by oldest to newest (for the graph x-axis)
    reports = Report.query.order_by(Report.date.asc()).all()
    
    history_data = []
    for r in reports:
        # Check if raw_data exists and has results
        results = r.raw_data.get('results', []) if r.raw_data else []
        
        history_data.append({
            'id': r.id,
            'date': r.date.strftime('%Y-%m-%d'), # Format date for the chart
            'results': results
        })
    
    return jsonify(history_data)

if __name__ == '__main__':
    app.run(debug=True)