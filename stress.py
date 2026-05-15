import sys
import json
import time
import random
import threading
import requests
import os

PROD_IP = "34.39.248.169"  # defina o IP da máquina X aqui

PHASE_DURATION = 15        # segundos por etapa
INTERVAL = 0.05            # 50ms entre requisições por thread


def get_base_url(env: str) -> str:
    if env == "dev":
        return "http://localhost:3000"
    elif env == "prod":
        return f"http://{PROD_IP}:80"
    else:
        raise ValueError(f"Ambiente inválido: '{env}'. Use 'dev' ou 'prod'.")


with open("sample-data.json", encoding="utf-8") as f:
    SAMPLE_DATA = json.load(f)

WORDS = list(SAMPLE_DATA.keys())
METHODS = ["GET_WORD", "GET_WORD_OF_THE_DAY", "GET_ALL", "POST", "PATCH", "DELETE"]


def get_random_entry():
    term = random.choice(WORDS)
    entry = SAMPLE_DATA[term]
    meanings = entry.get("MEANINGS", [])
    meaning = meanings[0] if meanings else ["Noun", "sem definição", [], []]
    return term, entry, meaning


def build_create_body(term: str, entry: dict, meaning: list) -> dict:
    return {
        "word": {
            "term": term.lower(),
            "synonyms": [s.lower() for s in entry.get("SYNONYMS", [])],
            "antonyms": [a.lower() for a in entry.get("ANTONYMS", [])],
        },
        "meaning": {
            "part_of_speech": meaning[0],
            "definition": meaning[1],
            "categories": meaning[2],
            "examples": meaning[3],
        },
    }


def build_patch_body(entry: dict, meaning: list) -> dict:
    return {
        "synonyms": [s.lower() for s in entry.get("SYNONYMS", [])],
        "antonyms": [a.lower() for a in entry.get("ANTONYMS", [])],
        "meaning": {
            "part_of_speech": meaning[0],
            "definition": meaning[1],
            "categories": meaning[2],
            "examples": meaning[3],
        },
    }


class PhaseStats:
    def __init__(self, name: str):
        self.name = name
        self.cache_hits = 0
        self.cache_misses = 0
        self.response_times: list = []
        self.lock = threading.Lock()

    def record(self, from_cache: bool, elapsed_ms: float):
        with self.lock:
            if from_cache:
                self.cache_hits += 1
            else:
                self.cache_misses += 1
            self.response_times.append(elapsed_ms)

    @property
    def total(self):
        return self.cache_hits + self.cache_misses

    @property
    def hit_rate(self):
        return (self.cache_hits / self.total * 100) if self.total > 0 else 0

    @property
    def avg_response_ms(self):
        return (sum(self.response_times) / len(self.response_times)) if self.response_times else 0

    @property
    def min_response_ms(self):
        return min(self.response_times) if self.response_times else 0

    @property
    def max_response_ms(self):
        return max(self.response_times) if self.response_times else 0


def do_request(base_url: str, stats: PhaseStats):
    method = random.choice(METHODS)
    term, entry, meaning = get_random_entry()
    word = term.lower()

    try:
        start = time.perf_counter()

        if method == "GET_WORD":
            r = requests.get(f"{base_url}/words/{word}")
        elif method == "GET_WORD_OF_THE_DAY":
            r = requests.get(f"{base_url}/words/word-of-the-day")
        elif method == "GET_ALL":
            r = requests.get(f"{base_url}/words")
        elif method == "POST":
            body = build_create_body(term, entry, meaning)
            r = requests.post(f"{base_url}/words/{word}", json=body)
        elif method == "PATCH":
            body = build_patch_body(entry, meaning)
            r = requests.patch(f"{base_url}/words/{word}", json=body)
        elif method == "DELETE":
            r = requests.delete(f"{base_url}/words/{word}")

        elapsed_ms = (time.perf_counter() - start) * 1000

        try:
            resp_json = r.json()
            from_cache = str(resp_json.get("from_cache", "")).lower() == "true"
        except Exception:
            from_cache = False

        stats.record(from_cache, elapsed_ms)

        print(
            f"[{threading.current_thread().name}] {method:<20} /{word:<30} "
            f"→ {r.status_code} | cache_hit={from_cache} | {elapsed_ms:.1f}ms"
        )

    except Exception as e:
        print(f"[{threading.current_thread().name}] ERRO: {e}")


def thread_worker(base_url: str, stats: PhaseStats, stop_event: threading.Event):
    while not stop_event.is_set():
        do_request(base_url, stats)
        time.sleep(INTERVAL)


def run_phase(base_url: str, phase_name: str, num_threads: int) -> PhaseStats:
    stats = PhaseStats(phase_name)
    stop_event = threading.Event()

    threads = []
    for i in range(num_threads):
        t = threading.Thread(
            target=thread_worker,
            args=(base_url, stats, stop_event),
            name=f"{phase_name}-W{i + 1}",
            daemon=True,
        )
        t.start()
        threads.append(t)

    time.sleep(PHASE_DURATION)
    stop_event.set()

    for t in threads:
        t.join(timeout=2)

    return stats


def print_stats(stats: PhaseStats):
    print(f"\n{'='*55}")
    print(f"  {stats.name}")
    print(f"{'='*55}")
    print(f"  Requisições totais : {stats.total}")
    print(f"  Cache hits         : {stats.cache_hits}")
    print(f"  Cache misses       : {stats.cache_misses}")
    print(f"  Hit rate           : {stats.hit_rate:.1f}%")
    print(f"  Tempo médio        : {stats.avg_response_ms:.2f}ms")
    print(f"  Tempo mínimo       : {stats.min_response_ms:.2f}ms")
    print(f"  Tempo máximo       : {stats.max_response_ms:.2f}ms")
    print(f"{'='*55}\n")


def print_comparison(s1: PhaseStats, s2: PhaseStats):
    diff_avg = s2.avg_response_ms - s1.avg_response_ms
    diff_pct = ((diff_avg / s1.avg_response_ms) * 100) if s1.avg_response_ms > 0 else 0
    sinal = "+" if diff_avg > 0 else ""

    print(f"\n{'='*55}")
    print(f"  COMPARATIVO")
    print(f"{'='*55}")
    print(f"  {'':30} {'ETAPA 1':>10} {'ETAPA 2':>10}")
    print(f"  {'Requisições totais':<30} {s1.total:>10} {s2.total:>10}")
    print(f"  {'Cache hits':<30} {s1.cache_hits:>10} {s2.cache_hits:>10}")
    print(f"  {'Cache misses':<30} {s1.cache_misses:>10} {s2.cache_misses:>10}")
    print(f"  {'Hit rate':<30} {s1.hit_rate:>9.1f}% {s2.hit_rate:>9.1f}%")
    print(f"  {'Tempo médio (ms)':<30} {s1.avg_response_ms:>10.2f} {s2.avg_response_ms:>10.2f}")
    print(f"  {'Tempo mínimo (ms)':<30} {s1.min_response_ms:>10.2f} {s2.min_response_ms:>10.2f}")
    print(f"  {'Tempo máximo (ms)':<30} {s1.max_response_ms:>10.2f} {s2.max_response_ms:>10.2f}")
    print(f"{'='*55}")
    print(f"  Variação no tempo médio: {sinal}{diff_avg:.2f}ms ({sinal}{diff_pct:.1f}%)")
    influencia = "O cache reduziu" if diff_avg > 0 else "O cache aumentou"
    print(f"  {influencia} o tempo médio de resposta em {abs(diff_avg):.2f}ms ({abs(diff_pct):.1f}%)")
    print(f"{'='*55}\n")


def main():
    if len(sys.argv) < 2:
        print("Uso: python stress.py <dev|prod>")
        sys.exit(1)

    env = sys.argv[1]
    base_url = get_base_url(env)
    num_threads = os.cpu_count()

    print(f"\nAmbiente : {env}")
    print(f"Endereço : {base_url}")
    print(f"Threads  : {num_threads}")
    print(f"Intervalo: {int(INTERVAL * 1000)}ms por thread")
    print(f"Duração  : {PHASE_DURATION}s por etapa\n")

    # ── ETAPA 1: memcached ON ─────────────────────────────────────
    print("▶  ETAPA 1 — Memcached LIGADO")
    print(f"   Rodando por {PHASE_DURATION} segundos...\n")

    stats1 = run_phase(base_url, "ETAPA 1 — Memcached LIGADO", num_threads)

    print_stats(stats1)
    print("⏸  Etapa 1 concluída.")
    print("   Desligue os servidores Memcached e pressione ENTER para continuar...")
    input()

    # ── ETAPA 2: memcached OFF ────────────────────────────────────
    print("\n▶  ETAPA 2 — Memcached DESLIGADO")
    print(f"   Rodando por {PHASE_DURATION} segundos...\n")

    stats2 = run_phase(base_url, "ETAPA 2 — Memcached DESLIGADO", num_threads)

    print_stats(stats2)
    print_comparison(stats1, stats2)


if __name__ == "__main__":
    main()
