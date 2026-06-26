from flask import Flask, request, jsonify, render_template
import tensorflow as tf
from tensorflow.keras.models import load_model
from PIL import Image
import numpy as np
import io

app = Flask(__name__)

# CIFAR-10 class names
CLASS_NAMES = ['비행기', '자동차', '새', '고양이', '사슴', '개', '개구리', '말', '배', '트럭']

# Image descriptions mapped to classes
CLASS_DESCRIPTIONS = {
    '비행기': '하늘을 나는 고정익 항공기입니다. 여객기나 전투기 등 다양한 형태가 있습니다.',
    '자동차': '도로를 주행하는 네 바퀴 달린 승용차입니다.',
    '새': '깃털과 날개가 있으며 알을 낳는 조류입니다.',
    '고양이': '작고 유연하며 애완용으로 많이 기르는 포유류입니다.',
    '사슴': '뿔이 있고 다리가 긴 온순한 초식 동물입니다.',
    '개': '인간과 가장 친숙한 반려동물 중 하나입니다.',
    '개구리': '물과 뭍을 오가며 생활하는 양서류입니다.',
    '말': '사람이 타고 다니거나 짐을 끄는 데 사용되는 튼튼한 포유류입니다.',
    '배': '물 위를 떠다니며 사람이나 화물을 나르는 선박입니다.',
    '트럭': '화물을 운반하기 위해 만들어진 대형 자동차입니다.'
}

# Load the trained model
MODEL_PATH = 'cifar10_cnn_model.h5'
model = None

try:
    model = load_model(MODEL_PATH)
    print(f"Model loaded successfully from {MODEL_PATH}")
except Exception as e:
    print(f"Warning: Model could not be loaded. Please ensure train_model.py has run successfully. Error: {e}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': '모델이 준비되지 않았습니다. 모델 학습을 먼저 완료해주세요.'}), 500

    if 'image' not in request.files:
        return jsonify({'error': '이미지 파일이 전송되지 않았습니다.'}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': '선택된 파일이 없습니다.'}), 400

    try:
        # Read the image via PIL
        img_bytes = file.read()
        img = Image.open(io.BytesIO(img_bytes))
        
        # Convert to RGB in case of RGBA (png)
        img = img.convert('RGB')
        
        # Resize to match CIFAR-10 expected input
        img = img.resize((32, 32))
        
        # Convert to numpy array and normalize
        img_array = np.array(img) / 255.0
        
        # Expand dimensions to match batch size format (1, 32, 32, 3)
        img_array = np.expand_dims(img_array, axis=0)
        
        # Predict using the model
        predictions = model.predict(img_array)
        predicted_class_idx = np.argmax(predictions[0])
        probability = float(predictions[0][predicted_class_idx]) * 100
        
        label = CLASS_NAMES[predicted_class_idx]
        description = CLASS_DESCRIPTIONS[label]
        
        return jsonify({
            'label': label,
            'probability': round(probability, 2),
            'description': description
        })
        
    except Exception as e:
        print(f"Error processing image: {e}")
        return jsonify({'error': '이미지 분석 중 오류가 발생했습니다.'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5003, debug=True)
