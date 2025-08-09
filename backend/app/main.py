import os
import uuid
import shutil
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from spleeter.separator import Separator

app = FastAPI()

# allow frontend origin (in production set explicit origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# create separator once (2 stems)
separator = Separator('spleeter:2stems')

WORKDIR = '/tmp/spleeter_runs'
os.makedirs(WORKDIR, exist_ok=True)

@app.post('/separate')
async def separate(file: UploadFile = File(...)):
    # basic checks
    if not file.filename.lower().endswith(('.mp3', '.wav', '.m4a', '.flac', '.ogg')):
        raise HTTPException(status_code=400, detail='Unsupported audio format')

    run_id = str(uuid.uuid4())
    run_dir = os.path.join(WORKDIR, run_id)
    os.makedirs(run_dir, exist_ok=True)
    infile_path = os.path.join(run_dir, file.filename)

    # save upload
    with open(infile_path, 'wb') as f:
        shutil.copyfileobj(file.file, f)

    # run separation (spleeter writes to output folder)
    try:
        separator.separate_to_file(infile_path, run_dir)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Separation failed: {e}')

    base = os.path.splitext(file.filename)[0]
    out_vocals = os.path.join(run_dir, base, 'vocals.wav')
    out_acc = os.path.join(run_dir, base, 'accompaniment.wav')

    if not (os.path.exists(out_vocals) and os.path.exists(out_acc)):
        raise HTTPException(status_code=500, detail='Output files missing')

    # return URLs for downloads
    return {
        'vocals_url': f'/download/{run_id}/vocals.wav',
        'music_url': f'/download/{run_id}/accompaniment.wav',
        'id': run_id
    }

@app.get('/download/{run_id}/{filename}')
def download(run_id: str, filename: str):
    # guard basic path traversal
    if '..' in run_id or '..' in filename:
        raise HTTPException(status_code=400)
    file_path = os.path.join(WORKDIR, run_id, os.path.basename(filename))
    # some outputs live in a subfolder named after the original base
    if not os.path.exists(file_path):
        # try nested structure
        for sub in os.listdir(os.path.join(WORKDIR, run_id)):
            candidate = os.path.join(WORKDIR, run_id, sub, os.path.basename(filename))
            if os.path.exists(candidate):
                file_path = candidate
                break
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail='File not found')
    return FileResponse(file_path, filename=filename, media_type='audio/wav')
