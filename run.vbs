' 이 파일을 더블클릭하면 터미널(검은 창) 없이 조용히 앱을 켭니다.
' 실제 작업은 run.bat 이 하고, 이 파일은 그걸 화면에 아무것도 띄우지 않고 실행만 시킵니다.
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = dir
shell.Run "cmd /c """ & dir & "\run.bat""", 0, False
