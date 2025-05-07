from fastapi import FastAPI, File, UploadFile, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import cv2
import numpy as np
import easyocr
import shutil
import os
import uuid
import subprocess
import asyncio
import base64
import imutils

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Configuration ---
PORT = 5000
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# --- Initialize Models ---
helmet_net = cv2.dnn.readNet("yolov3-spp.weights", "yolov3-spp.cfg")
layer_names = helmet_net.getLayerNames()
output_layers = [layer_names[i - 1] for i in helmet_net.getUnconnectedOutLayers()]
with open("coco.names", "r") as f:
    classes = [line.strip() for line in f.readlines()]
    
ocr_reader = easyocr.Reader(['en'], gpu=False)

# --- Utility Functions ---
def detect_objects(img):
    height, width = img.shape[:2]
    blob = cv2.dnn.blobFromImage(img, 0.00392, (416, 416), (0, 0, 0), True, crop=False)
    helmet_net.setInput(blob)
    outs = helmet_net.forward(output_layers)
    
    boxes, confidences, class_ids = [], [], []
    for out in outs:
        for detection in out:
            scores = detection[5:]
            class_id = np.argmax(scores)
            confidence = scores[class_id]
            if confidence > 0.5:
                center_x = int(detection[0] * width)
                center_y = int(detection[1] * height)
                w = int(detection[2] * width)
                h = int(detection[3] * height)
                x = int(center_x - w / 2)
                y = int(center_y - h / 2)
                boxes.append([x, y, w, h, center_x, center_y])
                confidences.append(float(confidence))
                class_ids.append(class_id)
    return boxes, confidences, class_ids

# --- Simplified Helmet Detection Endpoint ---
@app.post("/detect-helmet")
async def detect_helmet(file: UploadFile = File(...)):
    try:
        file_path = os.path.join(UPLOAD_FOLDER, f"temp_{uuid.uuid4().hex}.jpg")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        img = cv2.imread(file_path)
        if img is None:
            os.remove(file_path)
            raise HTTPException(400, "Invalid image file")

        # Helmet detection logic
        boxes, confs, cids = detect_objects(img)
        person = any(classes[c] == 'person' for c in cids)
        moto = any(classes[c] == 'motorcycle' for c in cids)
        helmet = any(classes[c] == 'helmet' for c in cids)
        
        # Determine compliance status
        helmet_status = "✅ Helmet Compliant" 
        if person and moto:
            helmet_status = "⚠️ Helmet Violation" if not helmet else "✅ Helmet Compliant"

        os.remove(file_path)
        return {"status": {"helmet": helmet_status}}

    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(500, str(e))

# --- License Plate Detection Endpoint ---
@app.post("/detect-plate")
async def detect_plate(file: UploadFile = File(...)):
    try:
        file_path = os.path.join(UPLOAD_FOLDER, f"temp_{uuid.uuid4().hex}.jpg")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        img = cv2.imread(file_path)
        if img is None:
            os.remove(file_path)
            raise HTTPException(400, "Invalid image file")

        plate_text = "🚫 No plate detected"
        img_base64 = None

        try:
            # Plate detection pipeline
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            bfilter = cv2.bilateralFilter(gray, 11, 17, 17)
            edged = cv2.Canny(bfilter, 30, 200)
            
            contours = imutils.grab_contours(
                cv2.findContours(edged.copy(), cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            )
            contours = sorted(contours, key=cv2.contourArea, reverse=True)[:10]

            plate = next(
                (approx for contour in contours 
                 for approx in [cv2.approxPolyDP(contour, 0.018*cv2.arcLength(contour,True), True)]
                 if len(approx) == 4), None
            )

            if plate is not None:
                # OCR processing
                x,y = np.where(mask := cv2.drawContours(
                    np.zeros(gray.shape, np.uint8), [plate], -1, 255, -1) == 255
                )
                cropped = gray[np.min(x):np.max(x)+1, np.min(y):np.max(y)+1]
                
                plate_results = ocr_reader.readtext(cropped)
                valid_plates = [text for _, text, prob in plate_results if prob > 0.5 and len(text) > 4]
                plate_text = "🚗 " + " ".join(valid_plates) if valid_plates else "🚫 Invalid plate"

                # Image annotation
                cv2.rectangle(img, tuple(plate[0][0]), tuple(plate[2][0]), (0,255,0), 3)
                cv2.putText(img, plate_text, (plate[0][0][0], plate[1][0][1]+60), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,0), 2)
                _, buffer = cv2.imencode('.jpg', img)
                img_base64 = base64.b64encode(buffer).decode()

        except Exception as e:
            plate_text = f"⚠️ Plate detection error: {str(e)}"

        os.remove(file_path)
        return {
            "status": {"plate": plate_text},
            "processed_image": img_base64
        }

    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(500, str(e))

# --- Vehicle Counting Endpoint ---
@app.post("/count-vehicles")
async def count_vehicles(file: UploadFile = File(...)):
    tmp_vid = os.path.join(UPLOAD_FOLDER, f"temp_{uuid.uuid4().hex}.mp4")
    with open(tmp_vid, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    cap = cv2.VideoCapture(tmp_vid)
    if not cap.isOpened():
        os.remove(tmp_vid)
        raise HTTPException(400, "Invalid video file")

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out_path = os.path.join(UPLOAD_FOLDER, f"out_{uuid.uuid4().hex}.mp4")
    writer = cv2.VideoWriter(out_path, fourcc, fps, (w, h))

    line_y = h - 150
    counts = {"car":0, "bus":0}
    tracker = {}
    next_id = 0
    MIN_DIST = 30

    while True:
        ret, frame = cap.read()
        if not ret: break
        boxes, confs, cids = detect_objects(frame)
        idxs = cv2.dnn.NMSBoxes([b[:4] for b in boxes], confs, 0.5, 0.4)
        current = {}

        for i in idxs.flatten():
            x,y,w_,h_,cx,cy = boxes[i]
            vid = None
            for tid,data in tracker.items():
                if np.hypot(cx-data['cx'], cy-data['cy'])<MIN_DIST:
                    vid = tid; break
            if vid is None:
                vid = next_id; next_id+=1
                tracker[vid] = {'cx':cx,'cy':cy,'counted':False,'type':classes[cids[i]]}
            else:
                tracker[vid].update({'cx':cx,'cy':cy})

            current[vid]=True
            vtype = 'car' if cids[i]==2 else 'bus'
            if cy>line_y and not tracker[vid]['counted']:
                counts[vtype]+=1; tracker[vid]['counted']=True

            clr = (0,255,0) if vtype=='car' else (0,0,255)
            cv2.rectangle(frame,(x,y),(x+w_,y+h_),clr,2)
            cv2.putText(frame,f"{vtype} ID:{vid}",(x,y-10),cv2.FONT_HERSHEY_SIMPLEX,0.5,clr,2)

        for tid in list(tracker):
            if tid not in current: del tracker[tid]
        cv2.line(frame,(0,line_y),(w,line_y),(255,0,0),2)
        cv2.putText(frame,f"Cars: {counts['car']}",(10,30),cv2.FONT_HERSHEY_SIMPLEX,1,(0,255,0),2)
        cv2.putText(frame,f"Buses: {counts['bus']}",(10,70),cv2.FONT_HERSHEY_SIMPLEX,1,(0,0,255),2)

        writer.write(frame)

    cap.release(); writer.release(); os.remove(tmp_vid)
    return FileResponse(out_path, media_type="video/mp4", filename="annotated.mp4")

# --- WebSocket for Real-Time Vehicle Counting ---
@app.websocket("/ws/vehicle-count")
async def websocket_vehicle_count(websocket: WebSocket):
    await websocket.accept()
    try:
        video_bytes = await websocket.receive_bytes()
        file_path = os.path.join(UPLOAD_FOLDER, f"temp_{uuid.uuid4().hex}.mp4")
        
        with open(file_path, "wb") as f:
            f.write(video_bytes)
        
        cap = cv2.VideoCapture(file_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_delay = 1/fps if fps > 0 else 0.04
        
        line_y = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) - 150
        counts = {"car": 0, "bus": 0}
        tracker = {}
        next_id = 0
        MIN_DIST = 30
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            boxes, confs, cids = detect_objects(frame)
            idxs = cv2.dnn.NMSBoxes([b[:4] for b in boxes], confs, 0.5, 0.4)
            current = {}
            
            for i in idxs.flatten():
                x, y, w_, h_, cx, cy = boxes[i]
                vid = None
                for tid, data in tracker.items():
                    if np.hypot(cx - data['cx'], cy - data['cy']) < MIN_DIST:
                        vid = tid
                        break
                if vid is None:
                    vid = next_id
                    next_id += 1
                    tracker[vid] = {'cx': cx, 'cy': cy, 'counted': False, 'type': classes[cids[i]]}
                else:
                    tracker[vid].update({'cx': cx, 'cy': cy})
                
                current[vid] = True
                vtype = 'car' if cids[i] == 2 else 'bus'
                if cy > line_y and not tracker[vid]['counted']:
                    counts[vtype] += 1
                    tracker[vid]['counted'] = True
                
                clr = (0, 255, 0) if vtype == 'car' else (0, 0, 255)
                cv2.rectangle(frame, (x, y), (x + w_, y + h_), clr, 2)
                cv2.putText(frame, f"{vtype} ID:{vid}", (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, clr, 2)
            
            for tid in list(tracker):
                if tid not in current:
                    del tracker[tid]
            
            cv2.line(frame, (0, line_y), (int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), line_y), (255, 0, 0), 2)
            cv2.putText(frame, f"Cars: {counts['car']}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.putText(frame, f"Buses: {counts['bus']}", (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            
            _, buffer = cv2.imencode('.jpg', frame)
            jpeg_bytes = buffer.tobytes()
            
            await websocket.send_json({"counts": counts})
            await websocket.send_bytes(jpeg_bytes)
            await asyncio.sleep(frame_delay)
        
        cap.release()
    except WebSocketDisconnect:
        print("Client disconnected")
    finally:
        if 'file_path' in locals():
            os.remove(file_path)

# --- Endpoint: Run Pygame Simulation ---
@app.get("/run-simulation")
async def run_simulation():
    subprocess.Popen(["python", "traffic_simulation.py"], shell=False)
    return JSONResponse({"message": "Traffic simulation started"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)