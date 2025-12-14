import os
from flask import Flask,render_template,request, jsonify
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=api_key)

app = Flask(__name__, template_folder='.', static_folder='.', static_url_path='')

SYSTEM_PROMPT = """
You are a helpful medical assistant. 
Analyze the attached blood report image. 
Identify the key values. 
Provide a summary in simple language.
List any values that are out of the normal range in bullet points.
Keep the tone reassuring but factual. 
Do not give medical advice or diagnosis.
"""


#Main
@app.route('/')
def index():
    return render_template('index.html')

#Analyze
@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        file_data = file.read()

        model = genai.GenerativeModel('gemini-flash-latest')

        response = model.generate_content([
            SYSTEM_PROMPT,
            {"mime_type": file.content_type, "data": file_data}
        ])

        return jsonify({'analysis': response.text})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)