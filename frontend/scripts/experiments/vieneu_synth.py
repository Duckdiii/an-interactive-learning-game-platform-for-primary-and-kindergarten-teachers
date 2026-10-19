"""
T8.3: bộ sinh giọng đọc cục bộ bằng VieNeu-TTS (chạy bởi tts-vieneu.mjs, không chạy trực tiếp trong game).

Chỉ làm hai việc, qua dòng lệnh:
  --list-voices                       liệt kê giọng có sẵn
  --jobs <jobs.json> --out <thư mục>  sinh từng câu trong jobs.json ra tệp .wav

Giao thức với Node: mỗi dòng kết quả bắt đầu bằng PREFIX rồi một đối tượng JSON (thư viện có thể tự in log
lên stdout, nên Node chỉ đọc các dòng có PREFIX). Không đọc khóa, không gọi mạng ngoài việc thư viện tự tải
mô hình lần đầu. Một việc lỗi là dừng cả lượt (giống các script khác).
"""
import os
import sys

# Bỏ thư mục của chính script khỏi sys.path TRƯỚC mọi import khác: một tệp json.py/wave.py/vieneu.py đặt cạnh script
# không được thay thế thư viện thật.
_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path = [p for p in sys.path if os.path.abspath(p or os.getcwd()) != _HERE]

import argparse  # noqa: E402
import json  # noqa: E402
import time  # noqa: E402
import wave  # noqa: E402

PREFIX = "@@VIENEU@@ "


def emit(payload):
    # Xuống dòng trước tiền tố: thư viện có thể đã in dở dòng (thanh tiến trình) lên stdout.
    sys.stdout.write("\n" + PREFIX + json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def wav_seconds(path):
    with wave.open(path, "rb") as handle:
        return handle.getnframes() / float(handle.getframerate())


def resolve_voice(engine, name):
    """Nhận nhãn hoặc id của giọng; None nghĩa là dùng giọng mặc định của thư viện."""
    if name is None:
        return None
    for label, voice_id in engine.list_preset_voices():
        if name in (label, voice_id):
            return voice_id
    raise ValueError("không có giọng: " + name)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--list-voices", action="store_true")
    parser.add_argument("--jobs")
    parser.add_argument("--out")
    args = parser.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    # Kiểm tham số TRƯỚC khi nạp mô hình (nạp mô hình lần đầu có thể rất lâu).
    if not args.list_voices and (not args.jobs or not args.out):
        emit({"event": "fatal", "error": "thiếu --jobs hoặc --out"})
        return 2

    try:
        from vieneu import Vieneu

        engine = Vieneu()
    except Exception as error:  # noqa: BLE001 - báo lại cho Node, không giấu lỗi
        emit({"event": "fatal", "error": "không nạp được vieneu: " + str(error)[:300]})
        return 3

    if args.list_voices:
        emit({"event": "voices", "voices": [{"label": label, "id": voice_id} for label, voice_id in engine.list_preset_voices()]})
        return 0

    with open(args.jobs, encoding="utf-8") as handle:
        jobs = json.load(handle)
    out_dir = os.path.abspath(args.out)

    for job in jobs:
        file_name = job["file"]
        if os.path.basename(file_name) != file_name or not file_name.endswith(".wav"):
            emit({"event": "error", "id": job["id"], "file": file_name, "error": "tên tệp không hợp lệ"})
            return 2
        target = os.path.join(out_dir, file_name)
        started = time.perf_counter()
        try:
            voice = resolve_voice(engine, job.get("voice"))
            audio = engine.infer(job["text"], voice=voice) if voice is not None else engine.infer(job["text"])
            engine.save(audio, target)
            emit({
                "event": "done",
                "id": job["id"],
                "file": file_name,
                "bytes": os.path.getsize(target),
                "seconds": round(wav_seconds(target), 3),
                "latencyMs": round((time.perf_counter() - started) * 1000),
            })
        except Exception as error:  # noqa: BLE001
            emit({"event": "error", "id": job["id"], "file": file_name, "error": str(error)[:300]})
            return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
