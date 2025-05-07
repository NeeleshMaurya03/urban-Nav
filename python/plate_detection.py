from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
import numpy as np
import easyocr
import imutils
import base64
from typing import Optional

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ANPRSystem:
    def __init__(self):
        self.reader = easyocr.Reader(['en'])
        
    async def process_image(self, image: np.ndarray) -> dict:
        try:
            # Image processing pipeline
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            bfilter = cv2.bilateralFilter(gray, 11, 17, 17)
            edged = cv2.Canny(bfilter, 30, 200)
            
            # Find contours
            keypoints = cv2.findContours(edged.copy(), cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            contours = imutils.grab_contours(keypoints)
            contours = sorted(contours, key=cv2.contourArea, reverse=True)[:10]
            
            location = None
            for contour in contours:
                peri = cv2.arcLength(contour, True)
                approx = cv2.approxPolyDP(contour, 0.018 * peri, True)
                if len(approx) == 4:
                    location = approx
                    break
                    
            if location is None:
                return {"error": "No license plate detected"}
            
            # Create mask and crop plate
            mask = np.zeros(gray.shape, np.uint8)
            new_image = cv2.drawContours(mask, [location], 0, 255, -1)
            new_image = cv2.bitwise_and(image, image, mask=mask)

            (x, y) = np.where(mask == 255)
            (x1, y1) = (np.min(x), np.min(y))
            (x2, y2) = (np.max(x), np.max(y))
            cropped = gray[x1:x2+1, y1:y2+1]

            # OCR processing
            result = self.reader.readtext(cropped)
            if not result:
                return {"error": "No text detected in license plate"}
            
            text = result[0][-2]

            # Draw results on original image
            output_image = image.copy()
            cv2.putText(output_image, text=text, org=(location[0][0][0], location[1][0][1] + 60), 
                        fontFace=cv2.FONT_HERSHEY_SIMPLEX, fontScale=1, 
                        color=(0, 255, 0), thickness=2, lineType=cv2.LINE_AA)
            cv2.rectangle(output_image, tuple(location[0][0]), tuple(location[2][0]), 
                         (0, 255, 0), 3)

            # Convert processed image to base64
            _, buffer = cv2.imencode('.png', output_image)
            processed_image = base64.b64encode(buffer).decode('utf-8')

            return {
                "license_plate": text,
                "coordinates": location.tolist(),
                "processed_image": processed_image
            }
            
        except Exception as e:
            return {"error": str(e)}

anpr = ANPRSystem()

@app.post("/detect-plate")
async def detect_plate(file: UploadFile = File(...)):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
            
        result = await anpr.process_image(image)
        
        if "error" in result:
            return JSONResponse(status_code=400, content=result)
            
        return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)