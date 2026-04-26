import cv2
import os
import numpy as np

# ----------------------------
# Load face detector
# ----------------------------
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)

# ----------------------------
# Extract face safely
# ----------------------------


def get_face(gray_img):
    faces = face_cascade.detectMultiScale(
        gray_img,
        scaleFactor=1.1,
        minNeighbors=3
    )

    if len(faces) == 0:
        return None

    x, y, w, h = faces[0]
    face = gray_img[y:y+h, x:x+w]

    if face.size == 0:
        return None

    return cv2.resize(face, (100, 100))


# ----------------------------
# Load known faces
# ----------------------------
known_faces = {}
base_folder = "known_faces"

for person in os.listdir(base_folder):
    person_path = os.path.join(base_folder, person)

    if not os.path.isdir(person_path):
        continue

    known_faces[person] = []

    for file in os.listdir(person_path):
        img_path = os.path.join(person_path, file)
        img = cv2.imread(img_path)

        if img is None:
            continue

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        face = get_face(gray)

        if face is not None:
            known_faces[person].append(face)

print("[INFO] Loaded people:", list(known_faces.keys()))

# ----------------------------
# Start camera
# ----------------------------
video = cv2.VideoCapture(0)

if not video.isOpened():
    print("Camera not accessible")
    exit()

# ----------------------------
# Recognition loop
# ----------------------------
try:
    while True:
        ret, frame = video.read()
        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=3
        )

        for (x, y, w, h) in faces:
            live_face = gray[y:y+h, x:x+w]

            if live_face.size == 0:
                continue

            live_face = cv2.resize(live_face, (100, 100))

            best_match = "Unknown"
            best_score = float("inf")

            # Compare with all people
            for person, samples in known_faces.items():
                for kface in samples:
                    diff = np.mean((kface - live_face) ** 2)

                    if diff < best_score:
                        best_score = diff
                        best_match = person

            # ----------------------------
            # SAFE DECISION LOGIC
            # ----------------------------
            threshold = 2500

            if best_score != float("inf") and best_score < threshold:
                label = f"MATCH: {best_match}"
                color = (0, 255, 0)
            else:
                label = "Unknown"
                color = (0, 0, 255)

            # Safe score display
            score_text = "inf" if best_score == float(
                "inf") else str(int(best_score))

            # Draw results
            cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
            cv2.putText(frame, f"{label} ({score_text})",
                        (x, y-10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

        cv2.imshow("Face Recognition System", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

except KeyboardInterrupt:
    print("Stopped")

finally:
    video.release()
    cv2.destroyAllWindows()
