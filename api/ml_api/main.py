from fastapi import FastAPI, Body
from typing import List
import requests
import json
from api.ml_api.models import InferenceResponse, InferenceComment, InferenceRequest

odd_example = {
    "example1": {
        "summary": "Пример набора отзывов",
        "value": {
            "data": [
                {"id": 1, "text": "Очень понравилось обслуживание в отделении, но мобильное приложение часто зависает."},
                {"id": 2, "text": "Кредитную карту одобрили быстро, но лимит слишком маленький."}
            ]
        }
    }
}

odd_responses = {
    200: {
        "description": "Success",
        "content": {
            "application/json": {
                "examples": {
                    "example1": {
                        "summary": "Пример успешного ответа",
                        "value": {
                            "predictions": [
                                {"id": 1, "topics": ["Обслуживание", "Мобильное приложение"], "sentiments": ["положительно", "отрицательно"]},
                                {"id": 2, "topics": ["Кредитная карта"], "sentiments": ["нейтрально"]}
                            ]
                        }
                    }
                }
            }
        }
    }
}

app = FastAPI()


@app.post("/predict", response_model=InferenceResponse, responses=odd_responses)
async def predict(data: InferenceRequest = Body(..., examples=odd_example)) -> InferenceResponse:
    """
    Метод для получения предсказаний ML-модуля для набора отзывов.
    """
    url = "http://188.225.34.42:8881/get_comments_predicts"
    preds = requests.post(url, json=json.loads(data.json())).json()
    return preds
