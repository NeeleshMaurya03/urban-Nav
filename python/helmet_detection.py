from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
from typing import List
import io

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load specialized helmet detection model (replace with your trained model)
helmet_net = cv2.dnn.readNet("helmet_detection.weights", "helmet_detection.cfg")
with open("helmet_classes.txt", "r") as f:
    helmet_classes = [line.strip() for line in f.readlines()]

# Configuration for optimal accuracy
CONFIDENCE_THRESHOLD = 0.7
NMS_THRESHOLD = 0.4
INPUT_SIZE = (640, 640)

def detect_helmets(img: np.ndarray) -> List[dict]:
    height, width = img.shape[:2]
    
    # Preprocess image
    blob = cv2.dnn.blobFromImage(
        img, 
        1/255.0, 
        INPUT_SIZE, 
        swapRB=True, 
        crop=False
    )
    
    # Perform detection
    helmet_net.setInput(blob)
    outputs = helmet_net.forward(helmet_net.getUnconnectedOutLayersNames())
    
    # Process detections
    boxes, confidences, class_ids = [], [], []
    
    for output in outputs:
        for detection in output:
            scores = detection[5:]
            class_id = np.argmax(scores)
            confidence = scores[class_id]
            
            if confidence > CONFIDENCE_THRESHOLD:
                # Scale bounding box coordinates
                box = detection[0:4] * np.array([width, height, width, height])
                (x, y, w, h) = box.astype("int")
                
                # Convert to proper box format
                x = int(x - (w / 2))
                y = int(y - (h / 2))
                
                boxes.append([x, y, int(w), int(h)])
                confidences.append(float(confidence))
                class_ids.append(class_id)
    
    # Apply Non-Maximum Suppression
    indices = cv2.dnn.NMSBoxes(
        boxes, 
        confidences, 
        CONFIDENCE_THRESHOLD,
        NMS_THRESHOLD
    )
    
    results = []
    if len(indices) > 0:
        for i in indices.flatten():
            results.append({
                "class": helmet_classes[class_ids[i]],
                "confidence": confidences[i],
                "box": boxes[i]
            })
    
    return results

@app.post("/detect-helmet")
async def detect_helmet(file: UploadFile = File(...)):
    try:
        content = await file.read()
        np_arr = np.frombuffer(content, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(400, "Invalid image file")
        
        # Convert to RGB for better accuracy
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Perform detection
        detections = detect_helmets(img)
        
        # Filter only helmet detections
        helmets = [d for d in detections if d["class"] == "helmet"]
        
        return {
            "helmet_detected": len(helmets) > 0,
            "total_helmets": len(helmets),
            "detections": helmets,
            "confidence": max([d["confidence"] for d in helmets], default=0)
        }
    
    except Exception as e:
        raise HTTPException(500, f"Processing error: {str(e)}")

# To run: uvicorn app:app --reload