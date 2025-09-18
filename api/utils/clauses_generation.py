from api.models.Filter import Filters


def generate_where_clause(filters: Filters) -> str:
    sql_filters = []
    if filters.service:
        services_str = ','.join(f"'{s}'" for s in filters.service)
        sql_filters.append(f"service IN ({services_str})")
    if filters.start_date:
        sql_filters.append(f"date >= '{filters.start_date}'")
    if filters.end_date:
        sql_filters.append(f"date <= '{filters.end_date}'")
    if filters.min_rating:
        sql_filters.append(f"rating >= {int(filters.min_rating)}")
    if filters.max_rating:
        sql_filters.append(f"rating <= {int(filters.max_rating)}")
    if filters.text:
        sql_filters.append(f"comment ILIKE '%{filters.text}%'")
    if filters.tags:
        sql_filters.append(f"hasAny(mapKeys(tags), {filters.tags})")
    if filters.source:
        source_str = ','.join(f"'{s}'" for s in filters.source)
        sql_filters.append(f"source IN ({source_str})")

    if filters.concurrent:
        sql_filters.append(f"bank = '{filters.concurrent}'")
    else:
        sql_filters.append(f"bank = 'газпромбанк'")

    if filters.comment_ids:
        sql_filters.append(f'comment_id IN ({", ".join(["'" + id_ + "'" for id_ in filters.comment_ids])})')
    where_clause = f"{' AND '.join(sql_filters)}" if sql_filters else "True"
    return where_clause
