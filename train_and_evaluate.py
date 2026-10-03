"""
Offline training / evaluation script used for the project report.

Trains a per-product linear regression model on historical sales
(exported from the `sales_history` MySQL table, see sample CSV) and
prints forecast accuracy metrics (MAE, RMSE). This demonstrates the
Pandas + Scikit-learn part of the stack independent of the live Flask API.

Usage:
    python train_and_evaluate.py --csv ../data/sample_sales_history.csv
"""
import argparse
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error


def train_for_product(df_product):
    df_product = df_product.sort_values("sale_date").reset_index(drop=True)
    df_product["day_index"] = np.arange(len(df_product))

    X = df_product[["day_index"]]
    y = df_product["quantity_sold"]

    if len(df_product) < 4:
        return None  # not enough data to split/evaluate

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, shuffle=False
    )

    model = LinearRegression()
    model.fit(X_train, y_train)
    preds = model.predict(X_test)

    mae = mean_absolute_error(y_test, preds)
    rmse = mean_squared_error(y_test, preds, squared=False)
    return {"mae": round(mae, 2), "rmse": round(rmse, 2), "n_samples": len(df_product)}


def main(csv_path):
    df = pd.read_csv(csv_path, parse_dates=["sale_date"])
    print(f"Loaded {len(df)} rows across {df['product_id'].nunique()} products\n")

    for product_id, group in df.groupby("product_id"):
        metrics = train_for_product(group)
        if metrics:
            print(f"Product {product_id}: MAE={metrics['mae']}, "
                  f"RMSE={metrics['rmse']}, samples={metrics['n_samples']}")
        else:
            print(f"Product {product_id}: not enough data points to evaluate")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", default="../data/sample_sales_history.csv")
    args = parser.parse_args()
    main(args.csv)
