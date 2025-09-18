from .piecharts import router as piecharts
from .histograms import router as histograms
from .filters import router as filters
from .tables import tables
from .timelines import router as timelines
from .unusual import router as other_graphics
from .metrics import router as metrics
from .smart_search import router as search_router
from .download_csv import router as csv_download_router
from .json_uploading import router as uploading_router

routers = [piecharts, histograms, filters, timelines, other_graphics,
           metrics, tables, search_router, csv_download_router, uploading_router]
