# NYSI-Capstone-Group-INSMS
## Creating venv to run ocr_service
### Step 1: Create a venv for ocr_service by running "python -m venv venv" on your terminal in a directory you want to store the venv
### Step 2: Install the following packages using pip install:
            - FastAPI (Web Framework for creating API server)
            - uvicorn (ASGI server to run FastAPI apps, i have no idea what that is too)
            - python-multipart (allows FastAPI to handle File uploads (images))
            - paddleocr (the OCR engine)
            - paddlepaddle (Deep learning framework required by paddleocr)
### Step 3: activate the venv, then cd to the OCR_service folder. Try running on command prompt instead of powershell if facing errors.
### Step 4: run the command "uvicorn ocr_server:app --reload --port 8001"
#### This doesnt have a frontend, just makes the python server containing the OCR and its environment to be accessible from Express.

## Running the Webportal (You should do this on a separate terminal):
### Step 1:cd to Backend folder
### Step 2: npm install the following packages:
    - express 
    - dotenv
    - multer (Handles file uploads from frontend)
    - axios (make HTTP request from express to Python FastAPI)
    - form-data (to send images to python FastAPI)
    - nodemon (optional, auto reloads server when updating script, dunnid manually shutdown and restart)
### Step 3: run "npx nodemon server.js" in your terminal (if you're using nodemon) or "node server.js" (if you're not)


## Setting up .env file: 
### Create a .env file on the same level as server.js and copy paste the telegram message sent previously.

