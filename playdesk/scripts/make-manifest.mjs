// Writes the PowerPoint add-in manifest with the address the app is deployed at.
//   PLAYDESK_URL=https://playdesk.example.com node scripts/make-manifest.mjs
// On Vercel the production address is picked up automatically.
import { mkdirSync, writeFileSync } from 'node:fs';

const fromVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined;
const url = (process.env.PLAYDESK_URL || fromVercel || 'https://localhost:5173').replace(
  /\/+$/,
  '',
);
const outDir = process.argv[2] || 'dist/office';

const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bt="http://schemas.microsoft.com/office/officeappbasictypes/1.0"
  xmlns:ov="http://schemas.microsoft.com/office/taskpaneappversionoverrides"
  xsi:type="TaskPaneApp">
  <Id>6f3c2a51-8d5e-4b8e-9d1a-3c7f5e2b9a41</Id>
  <Version>1.0.0.0</Version>
  <ProviderName>Playdesk</ProviderName>
  <DefaultLocale>en-US</DefaultLocale>
  <DisplayName DefaultValue="Playdesk"/>
  <Description DefaultValue="Draw football plays and insert them as editable PowerPoint slides."/>
  <IconUrl DefaultValue="${url}/office/icon-32.png"/>
  <HighResolutionIconUrl DefaultValue="${url}/office/icon-64.png"/>
  <SupportUrl DefaultValue="${url}/"/>
  <AppDomains>
    <AppDomain>${url}</AppDomain>
  </AppDomains>
  <Hosts>
    <Host Name="Presentation"/>
  </Hosts>
  <Requirements>
    <Sets DefaultMinVersion="1.1">
      <Set Name="PowerPointApi" MinVersion="1.2"/>
    </Sets>
  </Requirements>
  <DefaultSettings>
    <SourceLocation DefaultValue="${url}/addin"/>
  </DefaultSettings>
  <Permissions>ReadWriteDocument</Permissions>
  <VersionOverrides xmlns="http://schemas.microsoft.com/office/taskpaneappversionoverrides" xsi:type="VersionOverridesV1_0">
    <Hosts>
      <Host xsi:type="Presentation">
        <DesktopFormFactor>
          <GetStarted>
            <Title resid="GetStarted.Title"/>
            <Description resid="GetStarted.Description"/>
            <LearnMoreUrl resid="Home.Url"/>
          </GetStarted>
          <ExtensionPoint xsi:type="PrimaryCommandSurface">
            <OfficeTab id="TabHome">
              <Group id="Playdesk.Group">
                <Label resid="Group.Label"/>
                <Icon>
                  <bt:Image size="16" resid="Icon.16"/>
                  <bt:Image size="32" resid="Icon.32"/>
                  <bt:Image size="80" resid="Icon.80"/>
                </Icon>
                <Control xsi:type="Button" id="Playdesk.Open">
                  <Label resid="Button.Label"/>
                  <Supertip>
                    <Title resid="Button.Label"/>
                    <Description resid="Button.Tooltip"/>
                  </Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.16"/>
                    <bt:Image size="32" resid="Icon.32"/>
                    <bt:Image size="80" resid="Icon.80"/>
                  </Icon>
                  <Action xsi:type="ShowTaskpane">
                    <TaskpaneId>Playdesk.Taskpane</TaskpaneId>
                    <SourceLocation resid="Taskpane.Url"/>
                  </Action>
                </Control>
              </Group>
            </OfficeTab>
          </ExtensionPoint>
        </DesktopFormFactor>
      </Host>
    </Hosts>
    <Resources>
      <bt:Images>
        <bt:Image id="Icon.16" DefaultValue="${url}/office/icon-16.png"/>
        <bt:Image id="Icon.32" DefaultValue="${url}/office/icon-32.png"/>
        <bt:Image id="Icon.80" DefaultValue="${url}/office/icon-80.png"/>
      </bt:Images>
      <bt:Urls>
        <bt:Url id="Home.Url" DefaultValue="${url}/"/>
        <bt:Url id="Taskpane.Url" DefaultValue="${url}/addin"/>
      </bt:Urls>
      <bt:ShortStrings>
        <bt:String id="GetStarted.Title" DefaultValue="Playdesk is ready"/>
        <bt:String id="Group.Label" DefaultValue="Playdesk"/>
        <bt:String id="Button.Label" DefaultValue="Playdesk"/>
      </bt:ShortStrings>
      <bt:LongStrings>
        <bt:String id="GetStarted.Description" DefaultValue="Open Playdesk from the Home tab to draw plays and insert them as slides."/>
        <bt:String id="Button.Tooltip" DefaultValue="Draw football plays and insert them as editable slides."/>
      </bt:LongStrings>
    </Resources>
  </VersionOverrides>
</OfficeApp>
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/manifest.xml`, manifest);
console.log(`PowerPoint add-in manifest written to ${outDir}/manifest.xml for ${url}`);
