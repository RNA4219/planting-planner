from fastapi import FastAPI

app = FastAPI(title="planting-planner API")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
