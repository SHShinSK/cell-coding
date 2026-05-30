# Motion Alarm · 모션 알람

Physical AI PoC: `MotionDetected` → `AlarmPulse`.

| File | Role |
|------|------|
| [`motion-alarm.cell`](motion-alarm.cell) | Gate + actuator cells, `AlarmOrgan` |
| [`motion-alarm.celltest.json`](motion-alarm.celltest.json) | Cell Lab suites |

Full walkthrough · 전체 가이드: **[`../physical-ai-motion-alarm.md`](../physical-ai-motion-alarm.md)**

```bash
cd ../../typescript
npm run cell:run -- ../examples/motion-alarm/motion-alarm.cell MotionDetected '{"x":150,"y":220,"confidence":0.98}'
```
