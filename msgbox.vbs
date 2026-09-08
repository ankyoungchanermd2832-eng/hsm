' 터미널 없이도 오류 메시지를 보여주기 위한 작은 도우미.
' 사용법: wscript.exe msgbox.vbs "표시할 메시지"
If WScript.Arguments.Count > 0 Then
  MsgBox WScript.Arguments(0), vbOKOnly, "HSM"
End If
