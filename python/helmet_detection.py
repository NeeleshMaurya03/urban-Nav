from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import easyocr
import io

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLO model once at startup
def load_yolo():
    net = cv2.dnn.readNet("yolov3-spp.weights", "yolov3-spp.cfg")
    layer_names = net.getLayerNames()
    output_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]
    return net, output_layers

net, output_layers = load_yolo()
with open("coco.names", "r") as f:
    classes = [line.strip() for line in f.readlines()]

reader = easyocr.Reader(['en'], gpu=False)

# Utility: detect objects

def detect_objects(img):
    height, width, _ = img.shape
    blob = cv2.dnn.blobFromImage(img, 0.00392, (416, 416), (0, 0, 0), True, crop=False)
    net.setInput(blob)
    outputs = net.forward(output_layers)

    boxes, confidences, class_ids = [], [], []
    for out in outputs:
        for det in out:
            scores = det[5:]
            cid = np.argmax(scores)
            conf = float(scores[cid])
            if conf > 0.5:
                cx, cy, w, h = (det[0]*width, det[1]*height, det[2]*width, det[3]*height)
                x, y = int(cx - w/2), int(cy - h/2)
                boxes.append([x, y, int(w), int(h)])
                confidences.append(conf)
                class_ids.append(cid)
    return boxes, confidences, class_ids

# Utility: recognize number plates

def recognize_number_plate(img):
    results = reader.readtext(img)
    plates = [text for _, text, prob in results if len(text)>4 and prob>0.5]
    return plates

# API endpoint
@app.post("/detect-helmet-plate")
async def detect_helmet_plate(file: UploadFile = File(...)):
    # read image bytes
    content = await file.read()
    np_arr = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file")

    # object detection
    boxes, confidences, class_ids = detect_objects(img)

    # flags
    person, moto = False, False
    for i, cid in enumerate(class_ids):
        if classes[cid] == 'person': person = True
        if classes[cid] == 'motorcycle': moto = True

    helmet_ok = person and moto  # simplistic: if any person & motorcycle detected
    plates = recognize_number_plate(img)

    return {
        "helmet_on_motorcycle": helmet_ok,
        "plates": plates,
        "detections": [
            {"class": classes[cid], "box": boxes[i], "confidence": confidences[i]}
            for i, cid in enumerate(class_ids)
        ]
    }

# To run: uvicorn app:app --reload
