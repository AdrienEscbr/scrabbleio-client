import { usePrefs } from '../../lib/prefs.js';
import { sound } from '../../lib/feedback.js';
import { Segmented, Sheet, Switch } from '../../components/ui.jsx';
import './shared.css';

export default function SettingsSheet({ open, onClose, children }) {
  const { theme, sound: soundOn, haptics, setPref } = usePrefs();
  const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  return (
    <Sheet open={open} onClose={onClose} title="Réglages">
      <div className="settings">
        <div className="settings__group">
          <span className="eyebrow">Apparence</span>
          <Segmented
            label="Thème"
            value={theme}
            onChange={(v) => setPref({ theme: v })}
            options={[
              { value: 'system', label: 'Auto' },
              { value: 'light', label: 'Clair' },
              { value: 'dark', label: 'Sombre' },
            ]}
          />
        </div>
        <div className="settings__group">
          <span className="eyebrow">Retours</span>
          <Switch
            icon="volume"
            label="Sons"
            checked={soundOn}
            onChange={(v) => { setPref({ sound: v }); if (v) sound('place'); }}
          />
          {canVibrate && <Switch icon="vibrate" label="Vibrations" checked={haptics} onChange={(v) => setPref({ haptics: v })} />}
        </div>
        {children}
      </div>
    </Sheet>
  );
}
