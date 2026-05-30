# K8s prometheus-adapter E2E

`cell_signal_queue_depth` → Prometheus → prometheus-adapter → HPA external metric E2E.

## prerequisite

- docker
- [kind](https://kind.sigs.k8s.io/)
- kubectl

## 실행

```bash
node run-e2e.mjs
```

1. kind cluster `cell-coding-e2e` 생성
2. `cell-coding/runtime:0.1.0` 이미지 빌드·로드
3. `manifests/` apply (redis, worker-organ, prometheus, adapter, HPA)
4. queue depth 부하 → Prometheus scrape 검증
5. `custom.metrics.k8s.io` external metric 검증

클러스터가 이미 배포된 경우:

```bash
node verify-hpa.mjs
```
