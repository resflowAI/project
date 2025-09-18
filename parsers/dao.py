import os

from prefect import task
from clickhouse_connect import get_client


@task
async def fetch_last_parsing_date(service):
    ch_client = get_client(dsn=os.getenv("CLICKHOUSE_DSN"))
    dt = ch_client.query(
        f"SELECT MAX(date) FROM comments WHERE service = '{service}'"
    ).result_rows[0][0]
    return dt
