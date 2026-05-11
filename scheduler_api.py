from fastapi import APIRouter
import pandas as pd
import joblib

router = APIRouter()
models = joblib.load("ml/cognitask_scheduler_model.pkl")

WINDOW_HOURS = {
    "morning": list(range(8, 12)),
    "afternoon": list(range(12, 17)),
    "evening": list(range(17, 22)),
}

@router.post("/suggest-slot")
def suggest_slot(task: dict):
    sample = pd.DataFrame({
        "Category": [task["category"]],
        "Priority": [task["priority"]],
        "Duration_mins": [task["duration_mins"]],
        "Day": [task["day"]],
    })

    predicted_window = models["window"].predict(sample)[0]
    predicted_hour = int(models["hour"].predict(sample)[0])

    window_hours = WINDOW_HOURS.get(predicted_window, list(range(8, 22)))
    best_hour = predicted_hour if predicted_hour in window_hours else window_hours[len(window_hours) // 2]

    return {"best_hour": best_hour, "window": predicted_window}
