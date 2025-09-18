from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.bi import routers
from api.data_import import DATA_IMPORT_ROUTERS
from api.ml_api.main import app as ml_api_app
from api.events import events_router

app = FastAPI()

for route in routers:
    app.include_router(route, prefix="/api")

for route in DATA_IMPORT_ROUTERS:
    app.include_router(route, prefix="/api")

app.include_router(events_router, prefix="/api")

ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "https://resflow.ru",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

app.mount("/api/inference", ml_api_app)
