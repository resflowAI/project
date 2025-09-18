from fastapi import APIRouter, Depends, Query
from typing import Annotated, Any, Optional
from api.src.clickhouse import get_clickhouse
from api.models.Filter import Filters, get_filters
import requests
from api.bi.metrics import count_comments, average_mark, average_sentiment
from api.bi.unusual import word_cloud
from api.bi.piecharts import service_distribution, sentiment_distribution
from api.bi.histograms import tags_sentiment_histogram

router = APIRouter(prefix="/searching")


@router.get("/find_nearest_comments")
async def find_nearest_comments(
    connection: Annotated[Any, Depends(get_clickhouse)],
    filters: Filters = Depends(get_filters),
    theme: str = Query(...)
):
    filters.source = ["parsing"]

    nearest_comms = requests.get(f"http://188.225.34.42:8881/embeddings?comment={theme}").json()["matches"]
    ids = [x["id"] for x in nearest_comms]
    filters.comment_ids = ids
    metric2 = await average_sentiment(connection, filters)
    metric3 = await average_mark(connection, filters)
    wc = await word_cloud(connection, filters)
    sentiment_piechart = await sentiment_distribution(connection, filters)
    service_piechart = await service_distribution(connection, filters)
    tags_histogram = await tags_sentiment_histogram(connection, filters, top_n=5)

    return {
        "metrics": {
            "total_count": {"id": "123", "value": len(nearest_comms)},
            "avg_sentiment": metric2,
            "avg_rating": metric3,
        },
        "wordcloud": wc,
        "piecharts": {
            "sentiment": sentiment_piechart,
            "services": service_piechart
        },
        "nearest_tags": tags_histogram
    }


