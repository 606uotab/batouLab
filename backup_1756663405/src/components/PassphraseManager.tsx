import { useState } from 'react';
import { setPassphrase, clearPassphrase, hasPassphrase } from '../storage/crypto';

/**
 * Composant de gestion de passphrase.
 * Il affiche un champ de saisie lorsque la passphrase n'est pas encore définie
 * et un bouton “Verrouiller” lorsqu'elle est active. Pour l'utiliser,
 * importe ce composant dans ton interface et place-le en haut de ta page.
 */
export default function PassphraseManager() {
  const [pass, setPass] = useState('');
  const [unlocked, setUnlocked] = useState(hasPassphrase());

  const unlock = () => {
    if (!pass) return;
    setPassphrase(pass);
    setPass('');
    setUnlocked(true);
  };

  const lock = () => {
    clearPassphrase();
    setUnlocked(false);
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      {unlocked ? (
        <button onClick={lock}>Verrouiller</button>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Passphrase"
          />
          <button onClick={unlock}>Déverrouiller</button>
        </div>
      )}
    </div>
  );
}