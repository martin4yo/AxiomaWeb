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

[Registry]
; Registrar Native Messaging Host para Chrome
Root: HKLM; Subkey: "Software\Google\Chrome\NativeMessagingHosts\com.axiomaweb.printmanager"; ValueType: string; ValueName: ""; ValueData: "{app}\com.axiomaweb.printmanager.json"; Flags: uninsdeletekey

; Registrar Native Messaging Host para Edge
Root: HKLM; Subkey: "Software\Microsoft\Edge\NativeMessagingHosts\com.axiomaweb.printmanager"; ValueType: string; ValueName: ""; ValueData: "{app}\com.axiomaweb.printmanager.json"; Flags: uninsdeletekey

[UninstallDelete]
Type: filesandordirs; Name: "{%APPDATA}\axioma-print-manager"

[Code]
function EscapeJsonPath(Path: String): String;
var
  i: Integer;
begin
  Result := '';
  for i := 1 to Length(Path) do
  begin
    if Path[i] = '\' then
      Result := Result + '\\'
    else
      Result := Result + Path[i];
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ManifestFile: String;
  ExePath: String;
  JsonExePath: String;
  ManifestLines: TStringList;
begin
  if CurStep = ssPostInstall then
  begin
    // Crear el manifest JSON con la ruta correcta
    ManifestFile := ExpandConstant('{app}\com.axiomaweb.printmanager.json');
    ExePath := ExpandConstant('{app}\axioma-print-host.exe');

    // Escapar backslashes para JSON
    JsonExePath := EscapeJsonPath(ExePath);

    // Crear el archivo JSON
    ManifestLines := TStringList.Create;
    try
      ManifestLines.Add('{');
      ManifestLines.Add('  "name": "com.axiomaweb.printmanager",');
      ManifestLines.Add('  "description": "Axioma Print Manager - Native Messaging Host para impresion termica directa",');
      ManifestLines.Add('  "path": "' + JsonExePath + '",');
      ManifestLines.Add('  "type": "stdio",');
      ManifestLines.Add('  "allowed_origins": [');
      ManifestLines.Add('    "chrome-extension://EXTENSION_ID_PLACEHOLDER/"');
      ManifestLines.Add('  ]');
      ManifestLines.Add('}');

      ManifestLines.SaveToFile(ManifestFile);
    finally
      ManifestLines.Free;
    end;
  end;
end;
