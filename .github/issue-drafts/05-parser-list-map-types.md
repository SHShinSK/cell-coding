# [good-first-issue] Parser: parse List/Map type expressions · Parser: List/Map 타입 표현식 파싱

**Labels:** `good first issue`, `help wanted`, `feature`, `area:dsl-compiler`, `priority:medium`

---

## Status · 현황 (2026-05 code review)

`parseSingleType()` now maps built-in containers to dedicated AST nodes:

- `List<T>` → `ListType`
- `Map<K,V>` → `MapType`
- `Option<T>` → `OptionType`
- `Result<T,E>` → `ResultType`
- other `Name<...>` → `GenericType`

`parseSingleType()` 이 내장 컨테이너를 전용 AST 노드로 매핑합니다 (위 표 참고).

See `typescript/compile.test.ts` — "parses List and Map type expressions".

## Remaining tasks · 남은 작업

- [ ] Support multi-param generics beyond Map/Result (e.g. `Tuple<A,B,C>`) if added to spec · 다중 파라미터 제네릭
- [ ] Golden tests from `language-specification.html` §11 examples · 명세 §11 예제 골든 테스트

## References · 참고

- `typescript/ast.ts`, `typescript/parser.ts`, `language-specification.html` §11

## Definition of done · 완료 기준

All spec §11 container types parse into correct AST nodes with CI tests.

명세 §11 컨테이너 타입이 CI 테스트와 함께 올바른 AST 노드로 파싱됨.
