# 2 курс

Дисциплины второго курса. Каждая дисциплина это папка с `course.json`, главами и
фигурами, например `courses/2/<slug>/`.

Дисциплина создаётся командой из корня репозитория:

```powershell
$env:PYTHONUTF8=1
python tools/new_discipline.py 2 <slug> --title "<Название>" --code "<КОД>"
```
