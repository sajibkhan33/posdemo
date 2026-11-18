Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

WshShell.CurrentDirectory = scriptDir

nodeExe = "node.exe"
If fso.FileExists("C:\Program Files\nodejs\node.exe") Then
    nodeExe = "C:\Program Files\nodejs\node.exe"
ElseIf fso.FileExists("C:\Program Files (x86)\nodejs\node.exe") Then
    nodeExe = "C:\Program Files (x86)\nodejs\node.exe"
End If

' Run node print-agent.cjs completely hidden in the background (0 = SW_HIDE)
' If exitCode is 42 or 0 (intentional stop / clean shutdown), exit loop immediately
Do
    exitCode = WshShell.Run("""" & nodeExe & """ """ & scriptDir & "\print-agent.cjs""", 0, True)
    If exitCode = 42 Or exitCode = 0 Then
        Exit Do
    End If
    WScript.Sleep 3000
Loop
