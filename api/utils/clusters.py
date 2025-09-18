from clickhouse_connect.driver.client import Client
from api.models.Filter import get_filters, Filters
from api.utils.clauses_generation import generate_where_clause


def get_cluster_info(connection: Client, filters: Filters, reversed=True):
    data = connection.query(f"""
        SELECT `key`, countIf(value=1)/COUNT(*) FROM (
	        SELECT
    	        key,
    	        value
	        FROM comments
		        ARRAY JOIN
    		        mapKeys(tags) AS key,
    		        mapValues(tags) AS value
    	    WHERE {generate_where_clause(filters)}
        )
        GROUP BY `key`
    """).result_rows
    t = list(map(lambda x: {'cluster': x[0], 'value': x[1]}, data))
    t.sort(key=lambda x: x['value'], reverse=reversed)
    return t
