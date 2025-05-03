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

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Helmet & Plate Detection Setup ---
net = cv2.dnn.readNet("yolov3-spp.weights", "yolov3-spp.cfg")
layer_names = net.getLayerNames()
output_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]
with open("coco.names", "r") as f:
    classes = [line.strip() for line in f.readlines()]
reader = easyocr.Reader(['en'], gpu=False)

def detect_objects(img):
    h, w, _ = img.shape
    blob = cv2.dnn.blobFromImage(img, 0.00392, (416, 416), (0, 0, 0), True, crop=False)
    net.setInput(blob)
    outs = net.forward(output_layers)
    boxes, confidences, class_ids = [], [], []
    for out in outs:
        for det in out:
            scores = det[5:]
            cid = int(np.argmax(scores))
            conf = float(scores[cid])
            if conf > 0.5:
                cx, cy, ww, hh = det[0]*w, det[1]*h, det[2]*w, det[3]*h
                x, y = int(cx - ww/2), int(cy - hh/2)
                boxes.append([x, y, int(ww), int(hh), int(cx), int(cy)])
                confidences.append(conf)
                class_ids.append(cid)
    return boxes, confidences, class_ids

def recognize_number_plate(img):
    res = reader.readtext(img)
    return [text for _, text, prob in res if len(text)>4 and prob>0.5]

# --- Endpoint: Helmet & Plate Detection ---
@app.post("/detect-helmet-plate")
async def detect_helmet_plate(file: UploadFile = File(...)):
    tmp_in = f"tmp_{uuid.uuid4().hex}.jpg"
    with open(tmp_in, "wb") as buf:
        shutil.copyfileobj(file.file, buf)
    img = cv2.imread(tmp_in)
    if img is None:
        os.remove(tmp_in)
        raise HTTPException(400, "Invalid image file")

    boxes, confs, cids = detect_objects(img)
    person = any(classes[c]=='person' for c in cids)
    moto = any(classes[c]=='motorcycle' for c in cids)
    helmet_ok = not (person and moto)
    plates = recognize_number_plate(img)
    dets = [ {"class": classes[cids[i]], "box": boxes[i][:4], "confidence": confs[i]} for i in range(len(boxes)) ]

    os.remove(tmp_in)
    return {"helmet_on_motorcycle": helmet_ok, "plates": plates, "detections": dets}

# --- Endpoint: Vehicle Counting ---
@app.post("/count-vehicles")
async def count_vehicles(file: UploadFile = File(...)):
    tmp_vid = f"tmp_{uuid.uuid4().hex}.mp4"
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
    out_path = f"out_{uuid.uuid4().hex}.mp4"
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
        # Receive video file through WebSocket
        video_bytes = await websocket.receive_bytes()
        file_path = f"tmp_{uuid.uuid4().hex}.mp4"
        
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
            
            # Encode frame to JPEG
            _, buffer = cv2.imencode('.jpg', frame)
            jpeg_bytes = buffer.tobytes()
            
            # Send frame and counts through WebSocket
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
    # Launch the traffic_simulation.py script
    subprocess.Popen(["python", "traffic_simulation.py"], shell=False)
    return JSONResponse({"message": "Traffic simulation started"})

# To run server:
# uvicorn app:app --reload --host 0.0.0.0 --port 5000