from pydantic_settings import BaseSettings, SettingsConfigDict
from clickhouse_connect import get_client


class Settings(BaseSettings):
    clickhouse_dsn: str

    model_config = SettingsConfigDict(env_file=".env", env_prefix="")


settings = Settings()

ch_client = get_client(dsn=settings.clickhouse_dsn)


async def get_clickhouse():
    return ch_client
