' 서버(npm run dev)를 터미널 창 없이 백그라운드에서 켭니다.
' 문제가 생기면 .data\server.log 파일에서 원인을 확인할 수 있습니다.
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = dir

If Not fso.FolderExists(dir & "\.data") Then
  fso.CreateFolder(dir & "\.data")
End If

shell.Run "cmd /c npm run dev > "".data\server.log"" 2>&1", 0, False
