import { useEffect, useState } from 'react';
import { useApp } from '../../lib/store.js';
import { call } from '../../lib/socket.js';
import { errorMessage } from '../../lib/i18n.js';
import { Avatar, Button, Sheet } from '../../components/ui.jsx';
import { toast } from '../../components/Toaster.jsx';
import './shared.css';

export default function NicknameSheet({ open, onClose }) {
  const session = useApp((s) => s.session);
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setValue(session?.nickname ?? ''); setError(null); }
  }, [open, session?.nickname]);

  const save = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const { nickname } = await call('player:setNickname', { nickname: value });
      useApp.getState().setSession({ ...useApp.getState().session, nickname });
      toast({ title: `Vous êtes maintenant ${nickname}`, tone: 'success' });
      onClose();
    } catch (err) {
      setError(errorMessage(err.code));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Votre pseudo"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={save} loading={saving} disabled={!value.trim()}>Enregistrer</Button>
        </>
      )}
    >
      <form className="nickname" onSubmit={save}>
        <Avatar name={value || '?'} size={64} />
        <input
          data-autofocus
          className={`field ${error ? 'is-invalid' : ''}`}
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(null); }}
          maxLength={16}
          autoComplete="nickname"
          autoCapitalize="words"
          enterKeyHint="done"
          aria-invalid={!!error}
          aria-describedby="nickname-hint"
        />
        <p id="nickname-hint" className={`field-hint ${error ? 'is-error' : ''}`}>
          {error ?? `${[...value].length}/16 · lettres, chiffres, espaces, - et _`}
        </p>
      </form>
    </Sheet>
  );
}
