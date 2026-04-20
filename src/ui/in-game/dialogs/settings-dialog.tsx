import { useState } from 'preact/hooks';
import {
  FaBug,
  FaDatabase,
  FaDesktop,
  FaPalette,
  FaUsers,
  FaVolumeUp,
} from 'react-icons/fa';
import { MdSpaceDashboard } from 'react-icons/md';
import { Tabs } from '@/ui/components';
import { useLocale } from '@/ui/context';
import { DialogBase } from './dialog-base';
import {
  AdvancedTab,
  DebugTab,
  GraphicsTab,
  HudTab,
  InterfaceTab,
  SocialTab,
  SoundTab,
} from './settings';

type SettingsTabId =
  | 'graphics'
  | 'interface'
  | 'sound'
  | 'social'
  | 'hud'
  | 'debug'
  | 'advanced';

function TabLabel({
  icon,
  text,
}: {
  icon: preact.ComponentChildren;
  text: string;
}) {
  return (
    <span class='flex items-center gap-1'>
      {icon}
      <span class='hidden sm:inline'>{text}</span>
    </span>
  );
}

export function SettingsDialog() {
  const { locale } = useLocale();
  const [activeTab, setActiveTab] = useState<SettingsTabId>('graphics');

  const tabs = [
    {
      id: 'graphics',
      label: (
        <TabLabel
          icon={<FaDesktop size={12} />}
          text={locale.settingsTabGraphics}
        />
      ),
    },
    {
      id: 'interface',
      label: (
        <TabLabel
          icon={<FaPalette size={12} />}
          text={locale.settingsTabInterface}
        />
      ),
    },
    {
      id: 'sound',
      label: (
        <TabLabel
          icon={<FaVolumeUp size={12} />}
          text={locale.settingsTabSound}
        />
      ),
    },
    {
      id: 'social',
      label: (
        <TabLabel
          icon={<FaUsers size={12} />}
          text={locale.settingsTabSocial}
        />
      ),
    },
    {
      id: 'hud',
      label: (
        <TabLabel
          icon={<MdSpaceDashboard size={12} />}
          text={locale.settingsTabHud}
        />
      ),
    },
    {
      id: 'debug',
      label: (
        <TabLabel icon={<FaBug size={12} />} text={locale.settingsTabDebug} />
      ),
    },
    {
      id: 'advanced',
      label: (
        <TabLabel
          icon={<FaDatabase size={12} />}
          text={locale.settingsTabAdvanced}
        />
      ),
    },
  ];

  return (
    <DialogBase id='settings' title={locale.settingsTitle} size='lg'>
      <div class='flex flex-col'>
        <div class='overflow-x-auto'>
          <Tabs
            name='settings'
            items={tabs}
            activeId={activeTab}
            onSelect={(id) => setActiveTab(id as SettingsTabId)}
            style='border'
            size='xs'
          />
        </div>
        <div class='max-h-96 overflow-y-auto'>
          {activeTab === 'graphics' && <GraphicsTab />}
          {activeTab === 'interface' && <InterfaceTab />}
          {activeTab === 'sound' && <SoundTab />}
          {activeTab === 'social' && <SocialTab />}
          {activeTab === 'hud' && <HudTab />}
          {activeTab === 'debug' && <DebugTab />}
          {activeTab === 'advanced' && <AdvancedTab />}
        </div>
      </div>
    </DialogBase>
  );
}
