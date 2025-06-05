from flask import Flask, Response, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO
import cv2
import cv2.data
import numpy as np
import time as time_module
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")
cap = None
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'mp3', 'wav'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Create uploads folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

show_boxes = False
time = 5
face_time = 5  # New face detection timer
last_eye_detection = time_module.time()
last_face_detection = time_module.time()
no_eyes_timer = 0
no_face_timer = 0
warning_sent = False
face_warning_sent = False  # New warning flag for face detection
keep_stream = True
audio_file_path = None  # Store the path to the uploaded audio file

def init_camera():
    global cap
    if cap is None:
        cap = cv2.VideoCapture(0)
    return cap

def release_camera():
    global cap
    if cap is not None:
        cap.release()
        cap = None

def gen_frames():
    global show_boxes, last_eye_detection, last_face_detection, no_eyes_timer, no_face_timer, warning_sent, face_warning_sent, cap
    while True:
        if not keep_stream:
            release_camera()
            time_module.sleep(0.1)
            continue
            
        if cap is None:
            cap = init_camera()
            
        success, frame = cap.read()
        if not success:
            break
        else:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.3, 5)
            eyes_detected = False
            face_detected = len(faces) > 0
            
            # Face detection timing logic
            if face_detected:
                last_face_detection = time_module.time()
                no_face_timer = 0
                if face_warning_sent:
                    socketio.emit('face_detected', {'message': 'Face detected again!'})
                    face_warning_sent = False
            else:
                no_face_timer = time_module.time() - last_face_detection
                if no_face_timer >= face_time and not face_warning_sent:
                    face_warning_sent = True
                    socketio.emit('face_warning', {
                        'message': f'No face detected for {no_face_timer:.1f} seconds!',
                        'duration': no_face_timer
                    })
                    if audio_file_path:
                        socketio.emit('play_audio', {'file_path': audio_file_path})
            
            # Existing eye detection logic
            for (x, y, w, h) in faces:
                if show_boxes:
                    cv2.rectangle(frame, (x, y), (x + w, y + h), (255, 0 , 0), 5)
                roi_gray = gray[y:y+w, x:x+w]
                roi_color = frame[y:y+h, x:x+w]
                eyes = eye_cascade.detectMultiScale(roi_gray, 1.3, 5)
                
                if len(eyes) > 0:
                    eyes_detected = True
                    last_eye_detection = time_module.time()
                    no_eyes_timer = 0
                    if warning_sent:
                        socketio.emit('eyes_detected', {'message': 'Eyes detected again!'})
                        warning_sent = False
                
                for (ex, ey, ew, eh) in eyes:
                    if show_boxes:
                        cv2.rectangle(roi_color, (ex, ey), (ex + ew, ey + eh), (0, 255, 0), 5)
            
            if not eyes_detected:
                no_eyes_timer = time_module.time() - last_eye_detection
                if no_eyes_timer >= time and not warning_sent:
                    warning_sent = True
                    socketio.emit('warning', {
                        'message': f'No eyes detected for {no_eyes_timer:.1f} seconds!',
                        'duration': no_eyes_timer
                    })

            ret, buffer = cv2.imencode('.jpg', frame)
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/')
def video_feed():
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/take_input', methods=['POST'])
def take_input():
    data = request.json
    try:
        input_value = int(data.get('input', 0))
        if input_value <= 0:
            return jsonify({
                "status": "error",
                "message": "Time must be greater than 0"
            }), 400
        global time
        time = input_value
        return jsonify({
            "status": "success",
            "message": f"Time set to {time} seconds"
        }), 200
    except (ValueError, TypeError):
        return jsonify({
            "status": "error",
            "message": "Invalid input. Please provide a positive integer."
        }), 400

@app.route('/show_boxes', methods=['POST'])
def toggle_boxes():
    global show_boxes
    data = request.json
    show_boxes = data.get('showBoxes')
    return jsonify({"status": "success", "message": "Boxes visibility toggled"}), 200

@app.route('/toggle_stream', methods=['POST'])
def toggle_stream():
    global keep_stream, cap
    data = request.json
    keep_stream = data.get('showStream')
    
    if not keep_stream:
        release_camera()
    else:
        init_camera()
        
    return jsonify({"status": "success", "message": "Stream toggled"}), 200

@app.route('/set_face_time', methods=['POST'])
def set_face_time():
    data = request.json
    try:
        input_value = int(data.get('input', 0))
        if input_value <= 0:
            return jsonify({
                "status": "error",
                "message": "Time must be greater than 0"
            }), 400
        global face_time
        face_time = input_value
        return jsonify({
            "status": "success",
            "message": f"Face detection time set to {face_time} seconds"
        }), 200
    except (ValueError, TypeError):
        return jsonify({
            "status": "error",
            "message": "Invalid input. Please provide a positive integer."
        }), 400

@app.route('/audio/<filename>')
def get_audio(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/upload_audio', methods=['POST'])
def upload_audio():
    global audio_file_path
    if 'file' not in request.files:
        return jsonify({
            "status": "error",
            "message": "No file part"
        }), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({
            "status": "error",
            "message": "No selected file"
        }), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        audio_file_path = f'http://localhost:5000/audio/{filename}'
        return jsonify({
            "status": "success",
            "message": "Audio file uploaded successfully"
        }), 200
    
    return jsonify({
        "status": "error",
        "message": "Invalid file type. Allowed types: mp3, wav"
    }), 400

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)