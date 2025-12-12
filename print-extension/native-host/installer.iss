; Axioma Print Manager - Native Host Installer
; Inno Setup Script

#define MyAppName "Axioma Print Manager Native Host"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "AxiomaWeb"
#define MyAppURL "https://github.com/martin4yo/AxiomaWeb"

[Setup]
AppId={{B8F3C9E1-5A2D-4B3C-9F1E-8D7A6C5B4E3F}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\AxiomaPrintManager
DisableProgramGroupPage=yes
OutputDir=.
OutputBaseFilename=AxiomaPrintManagerHostSetup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
UninstallDisplayIcon={app}\axioma-print-host.exe

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Files]
Source: "axioma-print-host.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "thermal-templates.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "com.axiomaweb.printmanager.json"; DestDir: "{app}"; Flags: ignoreversion

[Registry]
; Registrar Native Messaging Host para Chrome
Root: HKLM; Subkey: "Software\Google\Chrome\NativeMessagingHosts\com.axiomaweb.printmanager"; ValueType: string; ValueName: ""; ValueData: "{app}\com.axiomaweb.printmanager.json"; Flags: uninsdeletekey

; Registrar Native Messaging Host para Edge
Root: HKLM; Subkey: "Software\Microsoft\Edge\NativeMessagingHosts\com.axiomaweb.printmanager"; ValueType: string; ValueName: ""; ValueData: "{app}\com.axiomaweb.printmanager.json"; Flags: uninsdeletekey

[Run]
Filename: "{app}\update-manifest.bat"; Description: "Actualizar configuración"; Flags: runhidden waituntilterminated

[UninstallDelete]
Type: filesandordirs; Name: "{%APPDATA}\axioma-print-manager"

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var
  ManifestFile: String;
  ManifestContent: String;
  ExePath: String;
begin
  if CurStep = ssPostInstall then
  begin
    // Actualizar el manifest JSON con la ruta correcta
    ManifestFile := ExpandConstant('{app}\com.axiomaweb.printmanager.json');
    ExePath := ExpandConstant('{app}\axioma-print-host.exe');

    // Leer el contenido actual
    if LoadStringFromFile(ManifestFile, ManifestContent) then
    begin
      // Reemplazar la ruta del path con la ruta real
      StringChangeEx(ManifestContent, '"path": "axioma-print-host.exe"', '"path": "' + ExePath + '"', True);

      // Guardar el archivo actualizado
      SaveStringToFile(ManifestFile, ManifestContent, False);
    end;
  end;
end;
