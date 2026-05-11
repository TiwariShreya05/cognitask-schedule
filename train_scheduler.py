# ==============================
# CogniTask ML Scheduler Module
# ==============================
# Predicts the best time window and hour to schedule a task

import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report


# ==============================
# STEP 1: LOAD DATA
# ==============================
def load_data(file_path="data/cognitive_load_dataset.xlsx"):
    df = pd.read_excel(file_path, sheet_name="Weekly_Task_Log")

    required_cols = [
        "Category",
        "Priority",
        "Duration_mins",
        "Day",
        "Hour_of_Day",
    ]

    df = df[required_cols].dropna()
    return df


# ==============================
# STEP 2: TRAIN MODEL
# ==============================
def train_scheduler_model(file_path="data/cognitive_load_dataset.xlsx"):
    df = load_data(file_path)

    # Create a time window label for better accuracy
    def hour_to_window(h):
        if h < 12:
            return "morning"
        elif h < 17:
            return "afternoon"
        else:
            return "evening"

    df["Time_Window"] = df["Hour_of_Day"].apply(hour_to_window)

    X = df[["Category", "Priority", "Duration_mins", "Day"]]

    categorical_features = ["Category", "Priority", "Day"]
    numerical_features = ["Duration_mins"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features),
            ("num", "passthrough", numerical_features),
        ]
    )

    # Train window classifier (3 classes — much higher accuracy)
    y_window = df["Time_Window"]
    window_model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", RandomForestClassifier(n_estimators=300, max_depth=12, random_state=42)),
        ]
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_window, test_size=0.2, random_state=42
    )
    window_model.fit(X_train, y_train)
    y_pred = window_model.predict(X_test)
    print("=== Time Window Classifier ===")
    print("Accuracy:", accuracy_score(y_test, y_pred))
    print(classification_report(y_test, y_pred))

    # Train exact hour model too (for fine-grained prediction within window)
    y_hour = df["Hour_of_Day"]
    hour_model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", RandomForestClassifier(n_estimators=300, max_depth=15, random_state=42)),
        ]
    )

    X_train_h, X_test_h, y_train_h, y_test_h = train_test_split(
        X, y_hour, test_size=0.2, random_state=42
    )
    hour_model.fit(X_train_h, y_train_h)
    y_pred_h = hour_model.predict(X_test_h)
    print("\n=== Exact Hour Model ===")
    print("Accuracy:", accuracy_score(y_test_h, y_pred_h))

    # Save both models
    joblib.dump({"window": window_model, "hour": hour_model}, "ml/cognitask_scheduler_model.pkl")
    print("\n✅ Models saved at ml/cognitask_scheduler_model.pkl")

    return {"window": window_model, "hour": hour_model}


# ==============================
# STEP 3: LOAD MODEL
# ==============================
def load_model(model_path="ml/cognitask_scheduler_model.pkl"):
    return joblib.load(model_path)


# ==============================
# STEP 4: PREDICT BEST SLOT
# ==============================
WINDOW_HOURS = {
    "morning": list(range(8, 12)),
    "afternoon": list(range(12, 17)),
    "evening": list(range(17, 22)),
}


def suggest_best_slot(models, category, priority, duration_mins, day):
    sample = pd.DataFrame(
        {
            "Category": [category],
            "Priority": [priority],
            "Duration_mins": [duration_mins],
            "Day": [day],
        }
    )

    # Get window prediction
    predicted_window = models["window"].predict(sample)[0]
    # Get exact hour prediction
    predicted_hour = int(models["hour"].predict(sample)[0])

    # If exact hour falls in predicted window, use it; otherwise pick window midpoint
    window_hours = WINDOW_HOURS.get(predicted_window, list(range(8, 22)))
    if predicted_hour in window_hours:
        return predicted_hour
    return window_hours[len(window_hours) // 2]


# ==============================
# STEP 5: RUN FILE
# ==============================
if __name__ == "__main__":
    models = train_scheduler_model()

    test_cases = [
        ("Deep Work", "High", 90, "Monday"),
        ("Light Work", "Low", 30, "Wednesday"),
        ("Meetings", "Medium", 60, "Friday"),
        ("Exercise", "Low", 45, "Saturday"),
        ("Study", "High", 120, "Tuesday"),
    ]

    print("\n=== Predictions ===")
    for cat, pri, dur, day in test_cases:
        hour = suggest_best_slot(models, cat, pri, dur, day)
        print(f"  {cat} ({pri}, {dur}min, {day}) → {hour}:00")
