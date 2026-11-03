import os
import json

log_path = ".aistudio/artifacts/brain/219aa74f-f4b3-4a84-a7f9-19cd76ab3f8c/.system_generated/logs/transcript.jsonl"
if not os.path.exists(log_path):
    print("Log file not found.")
else:
    with open(log_path, "r", encoding="utf-8") as f:
        for line in f:
            if "Objects are not valid as a React child" in line:
                try:
                    obj = json.loads(line)
                    print(json.dumps(obj, indent=2))
                except Exception as e:
                    print("Error parsing line:", e)
                    print(line[:500])
