from flask import Flask, send_from_directory, request, jsonify
import requests
import logging
from urllib.parse import urlparse, parse_qs
import os
import json

app = Flask(__name__, static_folder='.')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
logging.basicConfig(filename=os.path.join(BASE_DIR, 'app.log'), level=logging.DEBUG)

# Ensure save directory exists
SAVE_DIR = os.path.join(BASE_DIR, 'saves')
os.makedirs(SAVE_DIR, exist_ok=True)

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')



@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# SAVE PROGRESS ENDPOINT
@app.route('/save', methods=['POST'])
def save_progress():
    data = request.get_json()
    save_code = data.get('save_code')
    progress = data.get('progress')

    if not save_code or progress is None:
        return jsonify({'error': 'Missing save_code or progress'}), 400

    save_path = os.path.join(SAVE_DIR, f"{save_code}.json")
    try:
        with open(save_path, 'w') as f:
            json.dump(progress, f)
        logging.info(f"Progress saved: {save_code}")
        return jsonify({'status': 'success', 'save_code': save_code})
    except Exception as e:
        logging.error(f"Error saving progress: {e}")
        return jsonify({'error': str(e)}), 500

# LOAD PROGRESS ENDPOINT
@app.route('/load/<save_code>', methods=['GET'])
def load_progress(save_code):
    save_path = os.path.join(SAVE_DIR, f"{save_code}.json")
    if not os.path.exists(save_path):
        logging.warning(f"Save file not found: {save_code}")
        return jsonify({'error': 'Save file not found'}), 404

    try:
        with open(save_path, 'r') as f:
            progress = json.load(f)
        logging.info(f"Progress loaded: {save_code}")
        return jsonify({'progress': progress})
    except Exception as e:
        logging.error(f"Error loading progress: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
