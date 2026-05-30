# [good-first-issue] Parser: parse List/Map type expressions · Parser: List/Map 타입 표현식 파싱

**Labels:** `good first issue`, `help wanted`, `feature`, `area:dsl-compiler`, `priority:medium`

---

## Problem · 문제

AST defines `ListType`, `MapType`, etc., but `parseSingleType()` does not parse `List<T>` or `Map<K,V>`.

AST에는 `ListType`, `MapType` 등이 정의되어 있으나 `parseSingleType()`이 `List<T>`, `Map<K,V>`를 파싱하지 않습니다.

## Tasks · 작업

- [ ] Extend `parseSingleType()` or add post-processing · `parseSingleType()` 확장 또는 후처리
- [ ] Test: `nucleus { cache: Map<String, Bool> }` · nucleus Map 타입 파싱 테스트

## References · 참고

- `typescript/ast.ts`, `typescript/parser.ts`

## Definition of done · 완료 기준

Spec examples parse into correct AST nodes.

명세 예제의 Map/List 타입이 AST에 반영됨.
