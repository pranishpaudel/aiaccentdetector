import os
import uuid
import urllib.request
import torchaudio
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from speechbrain.pretrained import EncoderClassifier

app = Flask(__name__)

# Configure upload folder
UPLOAD_FOLDER = '/tmp/uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Load model once at startup
print("Loading accent classification model...")
classifier = EncoderClassifier.from_hparams(
    source="Jzuluaga/accent-id-commonaccent_ecapa",
    savedir="pretrained_models/accent-id-commonaccent_ecapa"
)
print("Model loaded successfully!")

def classify_audio(file_path):
    """Process audio file and return accent classification"""
    try:
        # Classify the accent
        out_prob, score, index, text_lab = classifier.classify_file(file_path)
        
        # Format the result
        result = {
            'accent': text_lab[0],
            'score': float(score.item() * 100)
        }
        return result, None
    except Exception as e:
        return None, str(e)

@app.route('/classify', methods=['POST'])
def classify_accent():
    # Check if the request contains a file or URL
    if 'file' in request.files:
        # Handle file upload
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
            
        # Save uploaded file
        filename = secure_filename(file.filename)
        temp_filename = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], temp_filename)
        file.save(file_path)
        
    elif 'url' in request.form:
        # Handle URL
        audio_url = request.form.get('url')
        try:
            # Download the file
            temp_filename = f"{uuid.uuid4()}.wav"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], temp_filename)
            urllib.request.urlretrieve(audio_url, file_path)
        except Exception as e:
            return jsonify({'error': f'Failed to download audio from URL: {str(e)}'}), 400
    else:
        return jsonify({'error': 'No file or URL provided. Please upload a file or provide an audio URL'}), 400
    
    try:
        # Process the audio file
        result, error = classify_audio(file_path)
        
        # Clean up the temporary file
        if os.path.exists(file_path):
            os.remove(file_path)
            
        if error:
            return jsonify({'error': error}), 500
            
        return jsonify(result), 200
        
    except Exception as e:
        # Clean up in case of error
        if os.path.exists(file_path):
            os.remove(file_path)
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Accent classification service is running'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)