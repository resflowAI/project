import os
from typing import List
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient

from models import *

QDRANT_HOST = os.getenv("QDRANT_HOST")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION_NAME = "comments"

qdrant_client = QdrantClient(
    url=QDRANT_HOST,
    api_key=QDRANT_API_KEY,
)

CLASSES = [
    "Дебетовые карты",
    "Мобильное приложение",
    "Премиум подписка",
    "Вклады",
    "Ипотека",
    "Эквайринг",
    "Кредитные карты",
    "Обслуживание в офисе",
    "Дистанционное обслуживание",
    "Кредиты наличными",
    "Банкоматы",
    "Денежные переводы",
    "Обмен валют",
    "Рефинансирование",
    "Автокредиты",
]

MODEL_ARCH = "ai-forever/ruT5-base"
SENTIMENT_MODEL = "sergeyzh/rubert-mini-frida"
NUM_WORKERS = 2

sentiment_map = {0: "отрицательно", 1: "нейтрально", 2: "положительно"}


def load_models():
    tokenizer_main = AutoTokenizer.from_pretrained(MODEL_ARCH, use_fast=True)
    if tokenizer_main.pad_token is None:
        tokenizer_main.add_special_tokens({"pad_token": tokenizer_main.eos_token})

    tokenizer_clf = AutoTokenizer.from_pretrained(SENTIMENT_MODEL, use_fast=True)

    models_pool = []
    for i in range(NUM_WORKERS):
        model = AutoModelForSequenceClassification.from_pretrained(
            MODEL_ARCH,
            num_labels=len(CLASSES),
            problem_type="multi_label_classification",
        )
        state = torch.load("./bin/checkpoint_t5_2/mm2.pt", map_location="cpu")
        model.load_state_dict(state)
        model = model.to("cuda").eval()

        clf = AutoModelForSequenceClassification.from_pretrained(
            "./bin/sentiment_clf",
            num_labels=3,
            problem_type="single_label_classification",
        )
        clf = clf.to("cuda").eval()

        models_pool.append((tokenizer_main, model, tokenizer_clf, clf))

    return models_pool


models_pool = load_models()
encoder = SentenceTransformer("./bin/embeddings_extractor")
encoder = encoder.to("cuda")


def worker_predict(comments: List[InferenceComment], worker_id: int):
    tokenizer, model, tokenizer_clf, clf = models_pool[worker_id]

    ids = [x.id for x in comments]
    out = tokenizer(
        [x.text for x in comments],
        truncation=True,
        padding=True,
        return_tensors="pt",
        max_length=1215,
    ).to("cuda")
    with torch.no_grad():
        logits = model(**out).logits.detach().cpu()
        preds = torch.sigmoid(logits).numpy()

    all_clusters = []
    for row in preds:
        clusters = [CLASSES[i] for i in range(len(CLASSES)) if row[i] > 0.5]
        all_clusters.append(clusters)

    sentiment_inputs = []
    cluster_indices = []
    for id_, clusters, comment in zip(ids, all_clusters, comments):
        for c in clusters:
            sentiment_inputs.append(c + " [CLS] " + comment.text)
            cluster_indices.append((id_, c))

    results = {id_: {"id": id_, "topics": [], "sentiments": []} for id_ in ids}

    if sentiment_inputs:
        batch = tokenizer_clf(
            sentiment_inputs,
            padding=True,
            truncation=True,
            max_length=1215,
            return_tensors="pt",
        ).to("cuda")

        with torch.no_grad():
            logits = clf(**batch).logits.detach().cpu().numpy()
            labels = logits.argmax(axis=1)

        for (id_, cluster), label in zip(cluster_indices, labels):
            results[id_]["topics"].append(cluster)
            results[id_]["sentiments"].append(sentiment_map[label])
    return list(results.values())


app = FastAPI()


@app.post("/get_comments_predicts")
def get_comments_predicts(req: InferenceRequest):
    comments = req.data
    n = NUM_WORKERS
    batch_size = 3
    chunks = [comments[i : i + batch_size] for i in range(0, len(comments), batch_size)]

    results = []
    for i in range(0, len(chunks), NUM_WORKERS):
        subchunk = chunks[i : i + NUM_WORKERS]
        with ThreadPoolExecutor(max_workers=n) as executor:
            futures = [
                executor.submit(worker_predict, ch, j) for j, ch in enumerate(subchunk)
            ]
            for f in futures:
                results.extend(f.result())

    return {"predictions": results}


@app.get("/embeddings")
def calculate_embedding_for_comment(comment: str):
    emb = encoder.encode(
        [comment], normalize_embeddings=True, convert_to_numpy=True
    ).tolist()[0]

    results = qdrant_client.search(
        collection_name=QDRANT_COLLECTION_NAME,
        query_vector=emb,
        limit=4000,
        score_threshold=0.9,
    )

    matches = [{"id": r.id, "score": r.score} for r in results]

    return {"embedding": emb, "matches": matches}
