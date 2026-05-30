# [good-first-issue] Parser: List/Map 타입 표현식 파싱

**Labels:** `good first issue`, `help wanted`, `feature`, `area:dsl-compiler`, `priority:medium`

---

## 한국어

### 문제
AST에는 `ListType`, `MapType` 등이 정의되어 있으나 `parseSingleType()`이 `List<T>`, `Map<K,V>`를 파싱하지 않습니다.

### 작업
- [ ] `parseSingleType()` 확장 또는 후처리 추가
- [ ] `nucleus { cache: Map<String, Bool> }` 파싱 테스트

### 참고
- `typescript/ast.ts`, `typescript/parser.ts`

### 완료 기준
- 명세 예제의 Map/List 타입이 AST에 반영됨

---

## English

### Problem
AST defines `ListType`/`MapType` but parser does not handle `List<T>` or `Map<K,V>`.

### Tasks
- [ ] Extend type parsing in parser
- [ ] Add test for nucleus field with `Map<String, Bool>`

### Done when
Spec examples parse into correct AST nodes.
