Autant pour moi, j'ai fait un plan plus clair et mis à jour le dossier partagé. Anyway je te le mets ci-dessous. J'espere que l'on se comprendra mieux maintenant sur le travail à faire.

# 📌 Roadmap fonctionnalités (focus historique & sécurité)

### **1. Chiffrement local**

* **Implémentation** : dérivation clé avec Argon2id, chiffrement AES-GCM ou XChaCha20-Poly1305.
* **Verrouillage auto** après X minutes, gestion d’un `lock/unlock`.
* **Critères** : sans passphrase → fichiers illisibles, jamais de clé en clair sur disque.

### **2. Sauvegarde par fichier + index léger**

* **Index global** : `index.json` minimal (liste sessions).
* **Sessions** : 1 fichier JSON par session (`<id>.json`).
* **Snapshots optionnels** horodatés.
* **Critères** : suppression d’un fichier = perte isolée, index régénérable.

### **3. Snapshots automatiques & reprise crash**

* **Autosave** périodique (toutes les N minutes).
* **Snapshot** après chaque 50 messages.
* **Reprise** : au redémarrage → recharge dernier snapshot.
* **Critères** : bouton “Restaurer snapshot”.

### **4. Recherche plein-texte locale**

* **Indexation** : tokenisation simple + TF-IDF ou mini-vectoriel local.
* **Recherche** : par texte, modèle, date, tag.
* **Critères** : <200 ms pour 10k messages.

### **5. Export / Import**

* **Export** : JSON/Markdown lisible.
* **Import** : schéma validé, idempotent (pas de doublons).
* **Critères** : échanges partageables, restaurables.

### **6. Profils de modèles**

* **Presets** : Code, Raisonner, Brouillon rapide.
* **Paramètres** : température, max\_tokens, contraintes.
* **Critères** : 1 clic pour basculer, indication coût estimé.

### **7. Limites & quotas locaux**

* **Compteur** : tokens/appels par profil/jour.
* **Alertes** : seuils atteints = bandeau.
* **Mode éco** : réduction auto tokens/contexte.
* **Critères** : blocage soft configurable.

### **8. Verrouillage manuel + timer**

* **Bouton** “Verrouiller maintenant”.
* **Timer** auto-lock après X minutes d’inactivité.
* **Critères** : UI simple, raccourci clavier.

### **9. Bouton d’exportation**

* **UI** : dans la page historique, “Exporter session(s)”.
* **Formats** : JSON (brut), Markdown (lisible).
* **Critères** : export chiffré si session chiffrée, choix destination.


