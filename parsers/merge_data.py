from glob import glob
import json

import pandas as pd
import numpy as np

FOLDER_WIWTH_RESULT = "parsed_data/*"

month_to_num = {
    "января": "01",
    "февраля": "02",
    "марта": "03",
    "апреля": "04",
    "мая": "05",
    "июня": "06",
    "июля": "07",
    "августа": "08",
    "сентября": "09",
    "октября": "10",
    "ноября": "11",
    "декабря": "12",
}
short_month_to_num = {
    "янв": "01",
    "фев": "02",
    "мар": "03",
    "апр": "04",
    "мая": "05",
    "июн": "06",
    "июл": "07",
    "авг": "08",
    "сен": "09",
    "окт": "10",
    "ноя": "11",
    "дек": "12",
}


def custom_proc_file_brobank(x):
    return x.replace("Отзыв от", "").replace("в", "").strip()


def custom_proc_file_otzovik(x):
    lst = x.strip().split(" ")
    if len(lst) == 2:
        return lst[0] + " " + short_month_to_num[lst[1]]
    return lst[0] + "." + short_month_to_num[lst[1]] + "." + lst[2]


def custom_proc_file_vbr(x):
    x = x.strip()
    lst = x.split()
    start_index = min([i for i in range(len(lst)) if lst[i].isdigit()])
    return (
        lst[start_index]
        + "."
        + month_to_num[lst[start_index + 1]]
        + "."
        + lst[start_index + 2]
    )


def custom_proc_file_topbanki(x):
    x = x.strip()
    lst = x.split()
    return lst[0] + "." + month_to_num[lst[1]] + "." + lst[2].strip(",")


def read_dataset(path, custom_date_preprocessing=None, parser_label=None):
    json_body = json.load(open(path, "r"))
    df = pd.DataFrame(json_body)
    if custom_date_preprocessing:
        df["date"] = df["date"].apply(custom_date_preprocessing)

    df["rating"] = df["rating"].replace("", np.nan).astype("Int64")
    df["parser_label"] = parser_label
    df["date"] = pd.to_datetime(df["date"], format="mixed")
    return df


custom_postprocess = {
    "brobank": custom_proc_file_brobank,
    "otzovik": custom_proc_file_otzovik,
    "vbr": custom_proc_file_vbr,
    "topbanki": custom_proc_file_topbanki,
}


def merge_all_datasets():
    files = glob(FOLDER_WIWTH_RESULT)
    all_dataframes = []
    for i in range(len(files)):
        parser_label = files[i].split("/")[-1].split(".")[0]
        print(parser_label)
        df = read_dataset(
            files[i],
            custom_date_preprocessing=(
                custom_postprocess[parser_label]
                if parser_label in custom_postprocess
                else None
            ),
            parser_label=parser_label,
        )
        all_dataframes.append(df)

    result_df = pd.concat(all_dataframes, axis=0)
    return result_df
