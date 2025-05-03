from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import cv2
import numpy as np
import easyocr
import shutil
import os
import uuid

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLO for helmet & plate detection
net = cv2.dnn.readNet("yolov3-spp.weights", "yolov3-spp.cfg")
layer_names = net.getLayerNames()
output_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]
with open("coco.names", "r") as f:
    classes = [line.strip() for line in f.readlines()]
reader = easyocr.Reader(['en'], gpu=False)

# Utility: detect objects
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

# Utility: recognize number plates
def recognize_number_plate(img):
    res = reader.readtext(img)
    return [text for _, text, prob in res if len(text)>4 and prob>0.5]

@app.post("/detect-helmet-plate")
async def detect_helmet_plate(file: UploadFile = File(...)):
    # save temp image
    tmp_in = f"tmp_{uuid.uuid4().hex}.jpg"
    with open(tmp_in, "wb") as buf:
        shutil.copyfileobj(file.file, buf)
    img = cv2.imread(tmp_in)
    if img is None:
        os.remove(tmp_in)
        raise HTTPException(400, "Invalid image file")

    # detect objects
    boxes, confs, cids = detect_objects(img)
    person = any(classes[c]=='person' for c in cids)
    moto = any(classes[c]=='motorcycle' for c in cids)
    helmet_ok = not (person and moto)
    plates = recognize_number_plate(img)
    dets = [ {"class": classes[cids[i]], "box": boxes[i][:4], "confidence": confs[i]} for i in range(len(boxes)) ]

    os.remove(tmp_in)
    return {"helmet_on_motorcycle": helmet_ok, "plates": plates, "detections": dets}

@app.post("/count-vehicles")
async def count_vehicles(file: UploadFile = File(...)):
    # save temp video
    tmp_vid = f"tmp_{uuid.uuid4().hex}.mp4"
    with open(tmp_vid, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    cap = cv2.VideoCapture(tmp_vid)
    if not cap.isOpened():
        os.remove(tmp_vid)
        raise HTTPException(400, "Invalid video file")

    # output video writer setup
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out_path = f"out_{uuid.uuid4().hex}.mp4"
    writer = cv2.VideoWriter(out_path, fourcc, fps, (w, h))

    # counting line
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
            # match or new id
            for tid,data in tracker.items():
                dist = np.hypot(cx-data['cx'], cy-data['cy'])
                if dist<MIN_DIST:
                    vid = tid; break
            if vid is None:
                vid = next_id; next_id+=1
                tracker[vid] = {'cx':cx,'cy':cy,'counted':False,'type': classes[cids[i]]}
            else:
                tracker[vid].update({'cx':cx,'cy':cy})

            current[vid]=True
            vtype = 'car' if cids[i]==2 else 'bus'
            if cy>line_y and not tracker[vid]['counted']:
                counts[vtype]+=1; tracker[vid]['counted']=True

            # draw
            clr = (0,255,0) if vtype=='car' else (0,0,255)
            cv2.rectangle(frame,(x,y),(x+w_,y+h_),clr,2)
            cv2.putText(frame,f"{vtype} ID:{vid}",(x,y-10),cv2.FONT_HERSHEY_SIMPLEX,0.5,clr,2)

        # cleanup
        for tid in list(tracker):
            if tid not in current: del tracker[tid]
        # draw line and counts
        cv2.line(frame,(0,line_y),(w,line_y),(255,0,0),2)
        cv2.putText(frame,f"Cars: {counts['car']}",(10,30),cv2.FONT_HERSHEY_SIMPLEX,1,(0,255,0),2)
        cv2.putText(frame,f"Buses: {counts['bus']}",(10,70),cv2.FONT_HERSHEY_SIMPLEX,1,(0,0,255),2)

        writer.write(frame)

    cap.release(); writer.release(); os.remove(tmp_vid)

    # return processed video and counts
    return FileResponse(out_path, media_type="video/mp4", filename="annotated.mp4")

# Run with:
# uvicorn app:app --reload --host 0.0.0.0 --port 5000
