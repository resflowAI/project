from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    AutoModelForSequenceClassification,
)
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    AutoModel,
)
import torch.nn.functional as F
from peft import PeftModel, PeftConfig
from bitsandbytes.nn import Linear4bit
import torch
import time
import torch.nn as nn
from models import RawComment, Comment
import glob
import datetime
import pika
import json
import os
import pickle
import pymorphy3
import re
import uuid

morph = pymorphy3.MorphAnalyzer()
keywords_list = pickle.load(open("./keywords_list.pickle", "rb"))


def text_lemmatizing(text: str) -> str:
    if text is None:
        return ""
    text = text.replace("\n", " ")
    text = re.sub("[0-9:,\.!?()-/+*;•$&%]", " ", text.lower())
    text = [morph.parse(word)[0].normal_form for word in text.split()]
    text = " ".join([x for x in text if len(x) > 3])
    return text


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

tokenizer = AutoTokenizer.from_pretrained(MODEL_ARCH, use_fast=True)
if tokenizer.pad_token is None:
    tokenizer.add_special_tokens({"pad_token": tokenizer.eos_token})

model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_ARCH, num_labels=len(CLASSES), problem_type="multi_label_classification"
)

state = torch.load("./bin/checkpoint_t5_2/mm2.pt", map_location="cpu")
model.load_state_dict(state)

model = model.to("cuda")
model.eval()

tokenizer_clf = AutoTokenizer.from_pretrained(
    "sergeyzh/rubert-mini-frida", use_fast=True
)
clf = AutoModelForSequenceClassification.from_pretrained(
    "./bin/sentiment_clf",
    num_labels=3,
    problem_type="single_label_classification",
    device_map="cuda",
)
clf = clf.to("cuda").eval()


def get_predict(comment: str):
    out = tokenizer([comment], truncation=True, return_tensors="pt")
    with torch.no_grad():
        out["input_ids"] = out["input_ids"].to("cuda")
        out["attention_mask"] = out["attention_mask"].to("cuda")
        logits = model(**out).logits[0].detach().cpu()
        preds = torch.sigmoid(logits).numpy()
        print("logits:", preds)

    clusters = [CLASSES[i] for i in range(len(CLASSES)) if preds[i] > 0.5]
    if len(clusters) > 0:
        cluster_batch = tokenizer_clf(
            [clusters[i] + " [CLS] " + comment for i in range(len(clusters))],
            padding=True,
            truncation=True,
            max_length=1250,
            return_tensors="pt",
        )
        with torch.no_grad():
            cluster_batch["input_ids"] = cluster_batch["input_ids"].to("cuda")
            cluster_batch["attention_mask"] = cluster_batch["attention_mask"].to("cuda")
            cluster_batch["token_type_ids"] = cluster_batch["token_type_ids"].to("cuda")
            logits = clf(**cluster_batch).logits.detach().cpu().numpy().argmax(axis=1)
            cls = [{0: "negative", 1: "neutral", 2: "positive"}[l] for l in logits]

        return {"tags": {clusters[i]: cls[i] for i in range(len(clusters))}}
    return {"tags": {}}


def on_message(ch, method, properties, body):
    try:
        msg = json.loads(body)
        clusters = get_predict(msg["comment"])
        kws = [
            x for x in text_lemmatizing(msg["comment"]).split() if x in keywords_list
        ]
        clusters = {
            k: {"negative": -1, "neutral": 0, "positive": 1}[v]
            for k, v in clusters["tags"].items()
        }
        result = Comment(
            date=msg["date"].split("T")[0],
            comment=msg["comment"],
            name=msg["name"],
            rating=msg["rating"],
            bank=msg["bank"],
            service=msg["service"],
            tags=clusters,
            keywords=kws,
            source=msg.get("source") or "parsing",
        )
        print(result)
        result = result.model_dump_json()

        ch.basic_publish(exchange="", routing_key="processed-comments", body=result)
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        print("queue_error:", e)
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


def start_consumer():
    connection = pika.BlockingConnection(pika.URLParameters(os.getenv("AMQP_DSN")))

    channel = connection.channel()

    try:
        channel.queue_declare(queue="comments", durable=True)
        channel.queue_declare(queue="processed-comments", durable=True)
    except Exception as exc:
        print(exc)

    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue="comments", on_message_callback=on_message)

    print("[*] start listening")
    channel.start_consuming()


if __name__ == "__main__":
    start_consumer()
