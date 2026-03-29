from fastapi import FastAPI

app = FastAPI(title="Recovery API", version="0.1.0")


@app.get("/")
def root():
    return {"status": "ok", "service": "recovery-api"}


@app.get("/health")
def health():
    return {"status": "healthy"}
