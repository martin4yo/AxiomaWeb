; Script de Inno Setup para Axioma Print Manager
; Este archivo genera el instalador .exe para Windows

#define MyAppName "Axioma Print Manager"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Axioma Web"
#define MyAppURL "https://axiomaweb.axiomacloud.com"
#define MyAppExeName "AxiomaPrintManager.exe"
#define MyAppServiceName "AxiomaWebPrintManager"

[Setup]
; Información de la aplicación
AppId={{8F2A9D5C-1B3E-4F7A-9C2D-5E8B1A4C6F9D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={autopf}\AxiomaPrintManager
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=installer-output
OutputBaseFilename=AxiomaPrintManager-Setup-{#MyAppVersion}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64

; Iconos (opcional)
;SetupIconFile=icon.ico
;UninstallDisplayIcon={app}\{#MyAppExeName}

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "autostart"; Description: "Iniciar automáticamente con Windows"; GroupDescription: "Opciones de inicio:"; Flags: checkedonce
Name: "installservice"; Description: "Instalar como servicio de Windows (recomendado)"; GroupDescription: "Opciones de instalación:"; Flags: checkedonce

[Files]
; Ejecutable principal
Source: "build\AxiomaPrintManager.exe"; DestDir: "{app}"; Flags: ignoreversion

; Scripts de soporte
Source: "setup-certificates.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "configure-printer.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "install-service.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "uninstall-service.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "start-print-manager.bat"; DestDir: "{app}"; Flags: ignoreversion

; Documentación
Source: "README-INSTALADOR.md"; DestDir: "{app}"; Flags: ignoreversion isreadme
Source: "INSTALACION-WINDOWS.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "INICIO-AUTOMATICO.md"; DestDir: "{app}"; Flags: ignoreversion

; OpenSSL portable (para generar certificados)
Source: "tools\openssl\*"; DestDir: "{app}\tools\openssl"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
Name: "{app}\logs"; Permissions: users-full
Name: "{app}\certs"; Permissions: users-full
Name: "{app}\tickets"; Permissions: users-full

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\start-print-manager.bat"
Name: "{group}\Configurar Impresora"; Filename: "{app}\configure-printer.bat"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\start-print-manager.bat"; Tasks: autostart

[Run]
; Generar certificados SSL
Filename: "{app}\setup-certificates.bat"; Description: "Generar certificados SSL"; Flags: runhidden waituntilterminated

; Configurar nombre de impresora
Filename: "{app}\configure-printer.bat"; Description: "Configurar impresora térmica"; Flags: postinstall shellexec skipifsilent

; Instalar como servicio
Filename: "{app}\install-service.bat"; Description: "Instalar como servicio de Windows"; Tasks: installservice; Flags: runhidden waituntilterminated

; Iniciar el servicio
Filename: "sc"; Parameters: "start {#MyAppServiceName}"; Tasks: installservice; Flags: runhidden waituntilterminated

; O iniciar manualmente si no es servicio
Filename: "{app}\start-print-manager.bat"; Description: "Iniciar Print Manager ahora"; Tasks: not installservice; Flags: postinstall nowait skipifsilent

[UninstallRun]
; Detener y desinstalar servicio
Filename: "sc"; Parameters: "stop {#MyAppServiceName}"; Flags: runhidden
Filename: "{app}\uninstall-service.bat"; Flags: runhidden waituntilterminated

[Code]
var
  PrinterNamePage: TInputQueryWizardPage;

procedure InitializeWizard;
begin
  // Página para configurar el nombre de la impresora
  PrinterNamePage := CreateInputQueryPage(wpSelectTasks,
    'Configuración de Impresora',
    'Configure su impresora térmica',
    'Ingrese el nombre exacto de su impresora térmica como aparece en "Dispositivos e impresoras" de Windows.');

  PrinterNamePage.Add('Nombre de la impresora:', False);
  PrinterNamePage.Values[0] := 'POS-80';
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ConfigFile: String;
  PrinterName: String;
begin
  if CurStep = ssPostInstall then
  begin
    // Guardar configuración de impresora
    PrinterName := PrinterNamePage.Values[0];
    ConfigFile := ExpandConstant('{app}\config.txt');
    SaveStringToFile(ConfigFile, 'PRINTER_NAME=' + PrinterName, False);
  end;
end;

function InitializeUninstall(): Boolean;
begin
  Result := MsgBox('¿Está seguro que desea desinstalar Axioma Print Manager?' + #13#10 +
                   'Esto detendrá el servicio de impresión.',
                   mbConfirmation, MB_YESNO) = IDYES;
end;
