"""
Flask microservice: demand forecasting & reorder recommendation.
Consumed by the Node/Express backend at POST /predict/reorder.

Input JSON:
{
  "product_id": 1,
  "current_stock": 45,
  "reorder_level": 30,
  "history": [{"date": "2025-08-25", "quantity_sold": 12}, ...]
}

Output JSON:
{
  "forecast_next_7_days": 84.2,
  "avg_daily_demand": 12.0,
  "recommended_reorder_qty": 120,
  "stock_out_risk": "HIGH",
  "method": "linear_regression"
}
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

app = Flask(__name__)
CORS(app)

MIN_POINTS_FOR_REGRESSION = 5
FORECAST_HORIZON_DAYS = 7
LEAD_TIME_DAYS = 5  # assumed supplier lead time, used for safety stock


def build_forecast(history):
    """Fit a simple linear trend model on daily sales; fall back to a moving
    average when there isn't enough history for regression."""
    df = pd.DataFrame(history)
    if df.empty:
        return {"avg_daily_demand": 0, "forecast_next_7_days": 0, "method": "no_data"}

    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date")
    df["day_index"] = np.arange(len(df))

    if len(df) >= MIN_POINTS_FOR_REGRESSION:
        X = df[["day_index"]].values
        y = df["quantity_sold"].values
        model = LinearRegression()
        model.fit(X, y)

        future_idx = np.arange(len(df), len(df) + FORECAST_HORIZON_DAYS).reshape(-1, 1)
        predictions = model.predict(future_idx)
        predictions = np.clip(predictions, 0, None)  # demand can't be negative

        avg_daily_demand = float(predictions.mean())
        forecast_total = float(predictions.sum())
        method = "linear_regression"
    else:
        # Fallback: simple moving average
        avg_daily_demand = float(df["quantity_sold"].mean())
        forecast_total = avg_daily_demand * FORECAST_HORIZON_DAYS
        method = "moving_average"

    return {
        "avg_daily_demand": round(avg_daily_demand, 2),
        "forecast_next_7_days": round(forecast_total, 2),
        "method": method
    }


def assess_risk(current_stock, avg_daily_demand, reorder_level):
    if avg_daily_demand <= 0:
        return "LOW"
    days_of_cover = current_stock / avg_daily_demand
    if current_stock <= 0:
        return "CRITICAL"
    if days_of_cover <= LEAD_TIME_DAYS or current_stock <= reorder_level:
        return "HIGH"
    if days_of_cover <= LEAD_TIME_DAYS * 2:
        return "MEDIUM"
    return "LOW"


def recommend_reorder_qty(avg_daily_demand, current_stock, reorder_level):
    # Demand expected during supplier lead time, plus a safety-stock buffer.
    safety_stock = avg_daily_demand * 2
    target_stock = (avg_daily_demand * LEAD_TIME_DAYS) + safety_stock + reorder_level
    recommended = max(target_stock - current_stock, 0)
    return int(round(recommended))


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/predict/reorder", methods=["POST"])
def predict_reorder():
    data = request.get_json(force=True)
    history = data.get("history", [])
    current_stock = data.get("current_stock", 0)
    reorder_level = data.get("reorder_level", 0)

    forecast = build_forecast(history)
    risk = assess_risk(current_stock, forecast["avg_daily_demand"], reorder_level)
    reorder_qty = recommend_reorder_qty(forecast["avg_daily_demand"], current_stock, reorder_level)

    return jsonify({
        **forecast,
        "current_stock": current_stock,
        "reorder_level": reorder_level,
        "stock_out_risk": risk,
        "recommended_reorder_qty": reorder_qty
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
