' ========================================
' Print Manager - Axioma Web
' Iniciar en segundo plano (sin ventana)
' ========================================

Set WshShell = CreateObject("WScript.Shell")

' Obtener el directorio donde está este script
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Cambiar al directorio del Print Manager
WshShell.CurrentDirectory = scriptDir

' Ejecutar el .bat en modo oculto (0 = ventana oculta)
WshShell.Run """" & scriptDir & "\iniciar-print-manager.bat""", 0, False

Set WshShell = Nothing
