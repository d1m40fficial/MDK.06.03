# Figure brief: fig-08-dbms

Картотека связывает четыре таблицы, а замок транзакции держит изменения вместе до фиксации или отката.

- **Course / chapter / position:** УФИС, МДК.06.03 · Ch 14 (лекция 8) · Fig 1 of the chapter
- **Size:** Figure, about 55 to 75 parts
- **Reader:** знает, что ИС хранит данные, но путает таблицу, связь, транзакцию и блокировку; не понимает, почему нельзя записать заказ без платежа.

## The idea it must make obvious
Транзакция 42 меняет четыре таблицы как один набор: до фиксации другие читатели не видят средних состояний, откат возвращает все строки, а фиксация снимает блокировки.

## Truth (the model)
Use `./model.mjs`; do not duplicate numbers in `build.mjs`.

- **Inputs:** `TX = 42`; rows before transaction: students 3, orders 2, payments 2, audit 0. Student 2 has orders counter 1, the total of counters is 2, equal to orders rows.
- **State:** four operations.
  1. `INSERT orders 104` for student 2, amount 1200. Orders rows 2 -> 3. Locks `students#2` and `orders#104`.
  2. `INSERT payments 501` for order 104, amount 1200. Payments rows 2 -> 3. Adds lock `payments#501`.
  3. `UPDATE students 2` orders counter 1 -> 2. Students rows stay 3. Total counters 2 -> 3, equal to orders rows 3.
  4. `INSERT audit` for transaction 42. Audit rows 0 -> 1.
- **Rules:** all four operations share one transaction. `COMMIT` keeps rows `3/3/3/1`, clears all locks and makes the audit row durable. `ROLLBACK` returns rows `3/2/2/0`, counters to `1, 1, 0`, and clears locks. Invariants: every payment refers to an existing order, payment amount equals order amount 1200, and sum of student order counters equals orders row count.
- **Concrete values:** peak locks 3; operation counter 4; committed rows students/orders/payments/audit `3/3/3/1`; rolled back rows `3/2/2/0`.

## The object
A four-drawer card catalog cabinet. Each drawer is a table and carries a row counter. Brass rails connect drawer pairs: students to orders, orders to payments, orders to audit. A transaction clamp with four numbered stops runs across the rails. The clamp has two levers, green `ФИКСАЦИЯ` and red `ОТКАТ`.

- **What moves:** the clamp advances one stop per operation; amber lock pins drop onto the touched drawer handles; at the end one lever either seals the audit card into the journal drawer or pulls all cards back.
- **Mapping:** drawer -> table; row counter -> row count; brass rail -> foreign key relation; amber pin -> row lock; clamp -> transaction; four stops -> four operations; green lever -> commit; red lever -> rollback; audit drawer -> transaction log.
- **The one lit part:** the transaction clamp and its amber pins, because the whole point is what the transaction holds and when it lets go.

## Interaction
- **Pointer:** click a drawer to preview its role and current row count; click the clamp stops to jump to that operation. Drag does nothing.
- **Keyboard:** `Right` and `Space` step forward; `Left` steps back; `C` commits after operation 4; `X` rolls back from any working state; `Home` returns to idle; `R` resets.
- **Idle tour:** open transaction at 0/4, insert order, insert payment, update counter, append audit, hold one beat with four locks and the pending state, commit, then pause and reset. Five beats, about 9 seconds total.
- **Readout:** `T42 · 2/4 · блокировки 3 · строки 3/3/2/0`, then `COMMIT · 4/4 · блокировки 0 · строки 3/3/3/1` or `ROLLBACK · 0/4 · блокировки 0 · строки 3/2/2/0`.

## Card text
- **Fig:** Fig 1
- **Title:** Замок транзакции
- **Hint:** `→ шаг · C фиксация · X откат · R сброс`
- **Legend keys:** `lit` транзакция, `raised` блокировка, `dim` таблицы
- **Caption:** Четыре операции T42 проходят через ящики students, orders, payments и audit. До фиксации видны только промежуточные строки `3/3/2/0`, после фиксации остаются `3/3/3/1`, а откат возвращает `3/2/2/0`.

## How the chapter uses it
The text before the figure introduces the cabinet. The paragraph after points at operation 2: payment 501 and order 104 are locked together, so a reader cannot see a payment without its order. Then it asks the reader to press `C` and compare the audit row, then `X` and compare the counters. The chapter repeats the same numbers from the model.

## Done when
- `node build.mjs` writes `fig-08-dbms.html` and `fig-08-dbms-light.html`; `--audit` passes if the geometry has pipes, cables or round parts.
- Anatomy verify steps pass on desktop and 390 px, both themes, with 4x close-ups.
- The four operation moments, commit, and rollback are readable without reading the chapter.
