# 3 курс

Дисциплины третьего курса. Каждая дисциплина это папка с `course.json`, главами и
фигурами, например `courses/3/<slug>/`.

Дисциплина создаётся командой из корня репозитория:

```powershell
$env:PYTHONUTF8=1
python tools/new_discipline.py 3 <slug> --title "<Название>" --code "<КОД>"
```
